use npm_rs::{NodeEnv, NpmEnv};
use prost_build;
use std::fs::File;
use std::io::prelude::*;
use std::path::Path;
use wtransport::tls::{Sha256Digest, Sha256DigestFmt};
use wtransport::Certificate;

use certificate_serde;

fn create_and_write_cert() -> Certificate {
    let certificate = Certificate::self_signed(["localhost", "127.0.0.1", "::1"]);

    let out_dir = std::env::var("OUT_DIR").expect("OUT_DIR must be set");
    let cert_path = Path::new(&out_dir).join(certificate_serde::LOCAL_CERT_NAME);

    println!("cargo:warning=writing cert to {}", cert_path.display());
    let mut cert_file = File::create(cert_path).expect("cert file should be writable");
    cert_file
        .write_all(certificate_serde::serialize_cert(certificate.clone()).as_bytes())
        .expect("file to be writable");
    certificate
}

fn create_digest(certificate: Certificate) -> Sha256Digest {
    certificate.hashes().pop().unwrap()
}

fn main() {
    prost_build::compile_protos(&["../interface.proto"], &["../"])
        .expect("protbuf should be compiled");

    let certificate = create_and_write_cert();
    let cert_digest = create_digest(certificate);

    let exit_status = NpmEnv::default()
        .with_node_env(&NodeEnv::from_cargo_profile().unwrap_or_default())
        .set_path("../frontend")
        .with_env("CERT_DIGEST", cert_digest.fmt(Sha256DigestFmt::BytesArray))
        .init_env()
        .install(None)
        .run("build")
        .exec();

    match exit_status {
        Ok(status) => println!("finished compiling NPM project with status: {}", status),
        Err(err) => println!("error compiling NPM project: {}", err),
    }
}
