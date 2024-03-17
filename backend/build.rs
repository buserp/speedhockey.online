use prost_build;

fn main() {
    prost_build::compile_protos(&["../interface.proto"], &["../"])
        .expect("protbuf should be compiled");
}
