const httpProxyHandler1 = {
    get (client, name) {
        if (client[name] !== undefined) {
            return client[name];
        } else {
            const proxyFunction = (args)=>client.call(name, args)
            ;
            proxyFunction.notify = (args)=>client.call(name, args, {
                    isNotification: true
                })
            ;
            proxyFunction.auth = (jwt)=>(args)=>client.call(name, args, {
                        jwt
                    })
            ;
            proxyFunction.batch = (args)=>client.batch([
                    {
                        [name]: args
                    }
                ], {
                    isNotification: false
                })
            ;
            return proxyFunction;
        }
    }
};
const wsProxyHandler1 = {
    get (client, name) {
        if (client[name] !== undefined || name === "then") {
            return client[name];
        } else {
            const proxyFunction = (args)=>client.call(name, args)
            ;
            proxyFunction.notify = (args)=>client.call(name, args, true)
            ;
            proxyFunction.subscribe = ()=>client.subscribe(name)
            ;
            proxyFunction.listen = ()=>client.listen(name)
            ;
            return proxyFunction;
        }
    }
};
export { httpProxyHandler1 as httpProxyHandler };
export { wsProxyHandler1 as wsProxyHandler };

