use std::fs;
use std::path::Path;
use aes_gcm::{Aes256Gcm, Key, Nonce, aead::{Aead, KeyInit}};
use rand::Rng;
use log::{info, error};
use serde::{Deserialize, Serialize};

const SECRET_KEY: &[u8; 32] = b"4fd8a3b2c1d4e5f67890123456789012";

#[derive(Serialize, Deserialize, Debug)]
struct Password {
    key: String,
    password: String,
}

#[tauri::command]
fn save_passwords(documentdir: String, passwords: Vec<Password>) -> String {
    info!("Passwords save hit !!");

    let file_path = Path::new(&documentdir).join("passwords.enc");

    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(SECRET_KEY);
    let cipher = Aes256Gcm::new(key);

    let nonce_bytes: [u8; 12] = rand::thread_rng().gen();
    let nonce = Nonce::from_slice(&nonce_bytes);

    // Convert the array to a JSON string
    let passwords_json = match serde_json::to_string(&passwords) {
        Ok(json) => json,
        Err(e) => {
            error!("Failed to serialize passwords: {}", e);
            return format!("Failed to serialize passwords: {}", e);
        }
    };

    // Encrypt the JSON string
    match cipher.encrypt(nonce, passwords_json.as_bytes()) {
        Ok(encrypted) => {
            let mut data_to_store = nonce_bytes.to_vec();
            data_to_store.extend(&encrypted);

            if let Err(e) = fs::write(file_path, data_to_store) {
                error!("Error writing file: {}", e);
                return format!("Failed to save passwords: {}", e);
            }
            info!("Passwords saved successfully");
            "Passwords saved successfully".to_string()
        }
        Err(e) => format!("Encryption error: {}", e),
    }
}


#[tauri::command]
fn load_passwords(documentdir: String) -> String {
    // info!("load_passwords function hit with documentdir: {}", documentdir);

    let file_path = Path::new(&documentdir).join("passwords.enc");
    // info!("Looking for passwords file at: {:?}", file_path);

    match fs::read(&file_path) {
        Ok(data) => {

            if data.len() < 12 {
                error!("Invalid data length, expected at least 12 bytes for nonce.");
                return "Invalid encrypted file format".to_string();
            }

            let key = Key::<Aes256Gcm>::from_slice(SECRET_KEY);
            let cipher = Aes256Gcm::new(key);

            let (nonce_bytes, encrypted_data) = data.split_at(12);
            let nonce = Nonce::from_slice(nonce_bytes);

            match cipher.decrypt(nonce, encrypted_data) {
                Ok(decrypted) => {
                    info!("Decryption successful.");
                    match String::from_utf8(decrypted) {
                        Ok(decoded_string) => {
                            decoded_string
                        }
                        Err(e) => {
                            error!("UTF-8 conversion error: {}", e);
                            "Decryption successful but UTF-8 error".to_string()
                        }
                    }
                }
                Err(e) => {
                    error!("Failed to decrypt passwords: {}", e);
                    "Failed to decrypt passwords".to_string()
                }
            }
        }
        Err(e) => {
            error!("Failed to read file: {}", e);
            "No passwords found".to_string()
        }
    }
}




#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    env_logger::init();

    info!("Tauri app is starting...");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![save_passwords, load_passwords]) // Register the new command
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
