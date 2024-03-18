protoc --plugin=protoc-gen-ts_proto=.\node_modules\.bin\protoc-gen-ts_proto.cmd --ts_proto_out=src --proto_path='..' '..\speedhockey_interface.proto'
if (Test-Path -Path "dist") {
    Remove-Item -Path "dist" -Recurse
}