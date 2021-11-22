const express = require('express')
const app = express()
const port = 9000

app.use('/', express.static(__dirname + '/'))

app.get('*', function(request, response, next) {
    console.log(request.path);
    if (request.path.startsWith('/hub')) {
        // Rewrite to /hub
        response.sendFile(__dirname + '/hub/index.html');
    } else if (request.path.startsWith('/keyguard')) {
        // Rewrite to /keyguard
        response.sendFile(__dirname + request.path + 'index.html');
    } else {
        // Rewrite to / (wallet)
        response.sendFile(__dirname + '/index.html');
    }
});

app.listen(port, () => {
  console.log(`WHK app listening at http://localhost:${port}`)
})
