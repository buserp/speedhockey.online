use prost_build;
use npm_rs::{NodeEnv, NpmEnv};
use std::fs::File;
use std::io::prelude::*;
use std::path::Path;
use wtransport::Certificate;

fn main() {
    prost_build::compile_protos(&["../interface.proto"], &[".."])
        .expect("protbuf should be compiled");

    // let certificate = Certificate::self_signed(["localhost", "127.0.0.1", "::1"]);
    // let cert_digest = certificate.hashes().pop().unwrap();
    // let out_dir = env::var("OUT_DIR").expect("OUT_DIR should be set");
    // let path = Path::new(&out_dir);
    // include!(concat!(env::var_os("OUT_DIR"), "/speedhockey.interface.rs"));
    // let mut cert_file = File::create("localhost_cert.pem").expect("cert file should be writable");
    // for cert in certificate.certificates() {
    //     match cert_file.write_all(cert) {
    //         Ok(_) => {},
    //         Err(err) => println!("error writing certs: {}", err),
    //     }
    // }
    
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