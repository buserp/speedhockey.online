use prost_build;

fn main() {
    prost_build::compile_protos(&["../speedhockey_interface.proto"], &["../"])
        .expect("protbuf should be compiled");
}
