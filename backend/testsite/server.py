import http.server
import ssl

server_address = ('speedhockey.development', 443)
httpd = http.server.HTTPServer(server_address, http.server.SimpleHTTPRequestHandler)
httpd.socket = ssl.wrap_socket(httpd.socket,
                               server_side=True,
                               certfile="../speedhockey.development.pem",
                               keyfile="../speedhockey.development-key.pem",
                               ssl_version=ssl.PROTOCOL_TLS)
httpd.serve_forever()