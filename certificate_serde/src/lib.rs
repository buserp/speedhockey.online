use serde::{Deserialize, Serialize};
use serde_json;
use wtransport::Certificate;

pub const LOCAL_CERT_NAME: &str = "localhost_cert.pem";

#[derive(Serialize, Deserialize)]
#[serde(remote = "Certificate")]
struct CertificateDef {
    #[serde(getter = "get_certificates")]
    certificates: Vec<Vec<u8>>,
    #[serde(getter = "get_private_key")]
    private_key: Vec<u8>,
}

// Provide a conversion to construct the remote type.
impl From<CertificateDef> for Certificate {
    fn from(cert: CertificateDef) -> Certificate {
        Certificate::new(cert.certificates, cert.private_key)
            .expect("certificate to be deserializable")
    }
}

#[derive(Serialize, Deserialize)]
struct CertWrapper(#[serde(with = "CertificateDef")] pub Certificate);

fn get_certificates(certificate: &Certificate) -> Vec<Vec<u8>> {
    return certificate.certificates().to_vec();
}

fn get_private_key(certificate: &Certificate) -> Vec<u8> {
    return certificate.private_key().to_vec();
}

pub fn serialize_cert(certificate: Certificate) -> String {
    let cert_wrapped: CertWrapper = CertWrapper(certificate);
    serde_json::to_string(&cert_wrapped).expect("certificate to be serializable")
}

pub fn deserialize_cert(certificate: String) -> Certificate {
    serde_json::from_str(&certificate)
        .map(|CertWrapper(dur)| dur)
        .unwrap()
}
