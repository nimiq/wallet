function generateId() {
    return window.crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
}
function createRequest({ method , params , isNotification =false , id  }) {
    const rpcRequest = {
        jsonrpc: "2.0",
        method
    };
    params && (rpcRequest.params = params);
    id = isNotification ? undefined : id !== undefined ? id : generateId();
    id !== undefined && (rpcRequest.id = id);
    return rpcRequest;
}
function createRequestBatch(batchObj, isNotification = false) {
    return Array.isArray(batchObj) ? batchObj.map((el)=>Object.entries(el).map(([method, arr])=>arr.map((params)=>createRequest({
                    method,
                    params,
                    isNotification
                })
            )
        )
    ).flat(2) : Object.entries(batchObj).map(([key, value])=>createRequest({
            method: value[0],
            params: value[1],
            isNotification,
            id: key
        })
    );
}
class BadServerDataError extends Error {
    id;
    code;
    data;
    constructor(id1, message, errorCode, data1){
        super(message);
        this.id = id1;
        this.code = errorCode;
        this.data = data1;
    }
}
function validateRpcNotification(data) {
    return data?.jsonrpc === "2.0" && typeof data.method === "string" && typeof data.id === "undefined";
}
function validateRpcBasis(data) {
    return data?.jsonrpc === "2.0" && (typeof data.id === "number" || typeof data.id === "string" || data.id === null);
}
function validateRpcSuccess(data) {
    return "result" in data;
}
function validateRpcFailure(data) {
    return typeof data?.error?.code === "number" && typeof data.error.message === "string";
}
function validateResponse(data) {
    if (validateRpcBasis(data)) {
        if (validateRpcSuccess(data)) return data;
        else if (validateRpcFailure(data)) {
            throw new BadServerDataError(data.id, data.error.message, data.error.code, data.error.data);
        }
    }
    throw new BadServerDataError(null, "The received data is no valid JSON-RPC 2.0 Response object.", null);
}
function send(resource, fetchInit) {
    return fetch(resource instanceof URL ? resource.href : resource, fetchInit).then((res)=>{
        if (!res.ok) {
            return Promise.reject(new RangeError(`${res.status} '${res.statusText}' received instead of 200-299 range.`));
        } else if (res.status === 204 || res.headers.get("content-length") === "0") {
            return undefined;
        } else return res.json();
    });
}
function processBatchArray(rpcResponseBatch) {
    return rpcResponseBatch.map((rpcResponse)=>validateResponse(rpcResponse).result
    );
}
function processBatchObject(rpcResponseBatch) {
    return rpcResponseBatch.reduce((acc, rpcResponse)=>{
        const rpcSuccess = validateResponse(rpcResponse);
        if (rpcSuccess.id !== null) {
            acc[rpcSuccess.id] = rpcSuccess.result;
            return acc;
        } else {
            throw new BadServerDataError(null, "Type 'null' cannot be used as an index type.", null);
        }
    }, {
    });
}
class Remote {
    resource;
    fetchInit;
    constructor(resource1, options = {
    }){
        const headers = options.headers === undefined ? new Headers() : options.headers instanceof Headers ? options.headers : new Headers(options.headers);
        headers.set("Content-Type", "application/json");
        this.fetchInit = {
            ...options,
            method: "POST",
            headers
        };
        this.resource = resource1;
    }
    batch(batchObj, { isNotification  } = {
    }) {
        return send(this.resource, {
            ...this.fetchInit,
            body: JSON.stringify(createRequestBatch(batchObj, isNotification))
        }).then((rpcResponseBatch)=>{
            if (rpcResponseBatch === undefined && isNotification) {
                return rpcResponseBatch;
            } else if (Array.isArray(rpcResponseBatch) && rpcResponseBatch.length > 0) {
                return Array.isArray(batchObj) ? processBatchArray(rpcResponseBatch) : processBatchObject(rpcResponseBatch);
            } else {
                throw new BadServerDataError(null, "The server returned an invalid batch response.", null);
            }
        });
    }
    call(method, params, { isNotification , jwt  } = {
    }) {
        const rpcRequestObj = createRequest({
            method,
            params,
            isNotification
        });
        return send(this.resource, {
            ...this.fetchInit,
            headers: jwt ? new Headers([
                ...this.fetchInit.headers.entries(),
                [
                    "Authorization",
                    `Bearer ${jwt}`
                ], 
            ]) : this.fetchInit.headers,
            body: JSON.stringify(rpcRequestObj)
        }).then((rpcResponse)=>rpcResponse === undefined && isNotification ? undefined : validateResponse(rpcResponse).result
        );
    }
}
function isObject(obj) {
    return obj !== null && typeof obj === "object" && Array.isArray(obj) === false;
}
class Remote1 {
    textDecoder;
    payloadData;
    payloadQueue = [];
    socket;
    constructor(socket1){
        this.socket = socket1;
        this.getPayloadData(socket1);
    }
    async getPayloadData(socket) {
        this.payloadData = new Promise((resolve, reject)=>{
            if (this.payloadQueue.length > 0) {
                const payload = this.payloadQueue.shift();
                resolve(payload);
                return;
            }
            let isResolved = false;
            socket.onmessage = async (event)=>{
                let msg;
                if (event.data instanceof Blob) {
                    msg = this.getTextDecoder().decode(await event.data.arrayBuffer());
                } else if (event.data instanceof ArrayBuffer) {
                    msg = this.getTextDecoder().decode(event.data);
                } else {
                    msg = event.data;
                }
                let payload;
                try {
                    payload = JSON.parse(msg);
                } catch (error) {
                    throw new BadServerDataError(null, `The server sent invalid JSON: ${error.message}`, null);
                }
                if (isResolved) {
                    this.payloadQueue.push(payload);
                    return;
                }
                resolve(payload);
                isResolved = true;
            };
            socket.onclose = ()=>resolve(null)
            ;
        });
        await this.payloadData;
        if (socket.readyState < 2) {
            this.getPayloadData(socket);
        }
    }
    getTextDecoder() {
        return this.textDecoder || (this.textDecoder = new TextDecoder());
    }
    async *iterateRequests(rpcRequest) {
        while(this.socket.readyState < 2){
            const payloadData = await this.payloadData;
            if (payloadData === null) {
                break;
            }
            if (Array.isArray(payloadData)) continue;
            if (payloadData.id !== rpcRequest.id) continue;
            const rpcResponse = validateResponse(payloadData);
            yield rpcResponse.result;
            break;
        }
    }
    async *iterateSubscriptions(rpcRequest) {
        while(this.socket.readyState < 2){
            try {
                const payloadData = await this.payloadData;
                if (payloadData === null) {
                    break;
                }
                if (Array.isArray(payloadData) && payloadData.length > 0) {
                    const rpcResponses = payloadData.map(validateResponse);
                    const invalid = rpcResponses.find((res)=>!isObject(res.result) || res.result.event !== "emitted"
                    );
                    if (invalid) {
                        throw new BadServerDataError(invalid.id || null, "The server returned an invalid batch response.", -32004);
                    } else {
                        for (const res of rpcResponses){
                            if (res.result.id === rpcRequest.id) {
                                yield res.result;
                            }
                        }
                    }
                } else {
                    const rpcResponse = validateResponse(payloadData);
                    if (isObject(rpcResponse.result) && rpcResponse.result.id === rpcRequest.id) {
                        switch(rpcResponse.result.event){
                            case "subscribed": continue;
                            case "unsubscribed": break;
                            case "emitted":
                                yield rpcResponse.result;
                                break;
                            default:
                                throw new BadServerDataError(rpcResponse.id ? rpcResponse.id : null, "The server returned an invalid response.", -32004);
                        }
                    }
                }
            } catch (err) {
                if (err.id === rpcRequest.id) {
                    yield Promise.reject(err);
                }
            }
        }
    }
    async *iterateNotifications(eventName) {
        while(this.socket.readyState < 2){
            const payloadData = await this.payloadData;
            if (payloadData === null) {
                break;
            }
            if (validateRpcNotification(payloadData)) {
                const rpcNotification = payloadData;
                if (rpcNotification.method === eventName) {
                    yield rpcNotification.params || null;
                }
            }
        }
    }
    call(method, params, isNotification = false) {
        const rpcRequest = createRequest({
            method,
            params,
            isNotification
        });
        this.socket.send(JSON.stringify(rpcRequest));
        if (isNotification) return Promise.resolve(undefined);
        const generator = this.iterateRequests(rpcRequest);
        return generator.next().then((p)=>p.value
        );
    }
    subscribe(method) {
        const rpcRequest = createRequest({
            method: "subscribe"
        });
        this.socket.send(JSON.stringify({
            ...rpcRequest,
            params: {
                method,
                id: rpcRequest.id
            }
        }));
        return {
            generator: this.iterateSubscriptions(rpcRequest),
            unsubscribe: (params)=>{
                const rpcRequestUnsubscription = createRequest({
                    method: "unsubscribe",
                    params: {
                        method,
                        id: rpcRequest.id
                    }
                });
                return this.socket.send(JSON.stringify(rpcRequestUnsubscription));
            },
            emit: (params)=>{
                return this.socket.send(JSON.stringify({
                    ...rpcRequest,
                    method: "emit",
                    params: {
                        method,
                        params,
                        id: rpcRequest.id
                    }
                }));
            },
            emitBatch: (params)=>{
                return this.socket.send(JSON.stringify(params.map((p)=>({
                        ...rpcRequest,
                        method: "emit",
                        params: {
                            method,
                            params: p,
                            id: rpcRequest.id
                        }
                    })
                )));
            }
        };
    }
    listen(eventName) {
        return {
            generator: this.iterateNotifications(eventName)
        };
    }
}
function listen(socket) {
    return new Promise((resolve, reject)=>{
        socket.onopen = ()=>resolve(socket)
        ;
        socket.onerror = (err)=>reject(err)
        ;
    });
}
function createRemote1(resourceOrSocket, options) {
    return resourceOrSocket instanceof WebSocket ? listen(resourceOrSocket).then((socket)=>new Remote1(socket)
    ) : new Remote(resourceOrSocket, options);
}
export { createRemote1 as createRemote };

