extern crate prost_build;

fn main() {
    prost_build::compile_protos(&["interface.proto"], &["src/"])
        .expect("protbuf should be compiled");
}