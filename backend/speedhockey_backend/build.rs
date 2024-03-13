use npm_rs::{NodeEnv, NpmEnv};
use prost_build;
use std::env;
use std::fs::File;
use std::io::prelude::*;
use std::path::Path;
use wtransport::Certificate;

use certificate_serde;

fn main() {
    prost_build::compile_protos(&["../../interface.proto"], &["../../"])
        .expect("protbuf should be compiled");

    let certificate = Certificate::self_signed(["localhost", "127.0.0.1", "::1"]);
    let cert_digest = certificate.hashes().pop().unwrap();

    let cert_serialized = certificate_serde::serialize_cert(certificate);

    let out_dir = std::env::var("OUT_DIR").expect("OUT_DIR must be set");
    let path = Path::new(&out_dir).join(certificate_serde::LOCAL_CERT_NAME);
    println!("cargo:warning=writing cert to {}", path.display());
    let mut cert_file = File::create(path).expect("cert file should be writable");
    cert_file
        .write_all(cert_serialized.as_bytes())
        .expect("file to be writable");

    // let exit_status = NpmEnv::default()
    //     .with_node_env(&NodeEnv::from_cargo_profile().unwrap_or_default())
    //     .set_path("./frontend")
    //     .init_env()
    //     .install(None)
    //     .run("build")
    //     .exec();

    // match exit_status {
    //     Ok(status) => println!("finished compiling NPM project with status: {}", status),
    //     Err(err) => println!("error compiling NPM project: {}", err),
    // }
}
