import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { documentDir, dataDir } from '@tauri-apps/api/path';
import './main-page.css';
import { FaCopy } from "react-icons/fa6";

function Main() {


  const [passwords, setPasswords] = useState([
    { key: '', password: '' } // First input row remains empty
  ]);

  const [paths, setPaths] = useState({
    documentDir: '',
    dataDir: ''
  });

  const [searchTerm, setSearchTerm] = useState('');



  // Function to save passwords securely to a file
  const savePasswordsToFile = async (passwords) => {
    try {
      await invoke("save_passwords", {
        documentdir: paths.documentDir,
        passwords, // Directly pass the array
      });
    } catch (error) {
      console.error("Error saving passwords:", error);
    }
  };


  // Fetch directories on mount
  useEffect(() => {
    const fetchDirectories = async () => {
      try {
        const documentPath = await documentDir();
        const dataPath = await dataDir();
        setPaths({ documentDir: documentPath, dataDir: dataPath });

        console.log("Fetched directories:", { documentDir: documentPath, dataDir: dataPath });
      } catch (error) {
        console.error('Error getting paths:', error);
      }
    };

    fetchDirectories();
  }, []);

  // Load passwords only after paths are set
  useEffect(() => {
    if (paths.documentDir) {
      const loadPasswords = async () => {
        try {
          console.log("Loading passwords from:", paths.documentDir);

          const storedPasswords = await invoke('load_passwords', { documentdir: paths.documentDir });

          // Log the response from invoke call
          console.log("Loaded passwords:", storedPasswords);

          // Parse the response if it's a string
          const parsedPasswords = Array.isArray(storedPasswords)
            ? storedPasswords
            : JSON.parse(storedPasswords);

          // Update state with parsed passwords
          setPasswords([{ key: '', password: '' }, ...parsedPasswords] || [{ key: '', password: '' }]);
        } catch (error) {
          console.error("Error loading passwords:", error);
        }
      };

      loadPasswords();
    }
  }, [paths.documentDir]);




  // Handle key press to add a new password
  const handleKeyPress = async (e, index) => {
    // Check if the Enter key is pressed
    if (e.key === 'Enter') {
      // If it's the first row (index 0)
      if (index === 0) {
        const newKey = passwords[0].key.trim();
        const newPassword = passwords[0].password.trim();

        if (newKey && newPassword) {
          // Add new entry & reset first row
          setPasswords([{ key: '', password: '' }, ...passwords]);

          // Save the new passwords array securely
          await savePasswordsToFile(passwords);
        }
      } else {
        // Update the specific password entry in the array
        const newPasswords = [...passwords];
        const updatedPassword = newPasswords[index];
        updatedPassword.key = updatedPassword.key.trim();
        updatedPassword.password = updatedPassword.password.trim();

        if (updatedPassword.key && updatedPassword.password) {
          setPasswords(newPasswords);

          await savePasswordsToFile(newPasswords.slice(1));
        }
        else if (!updatedPassword.key && !updatedPassword.password) {
          const filteredPasswords = newPasswords.filter((item, idx) => idx !== index);  // Remove empty entry

          setPasswords(filteredPasswords);

          await savePasswordsToFile(filteredPasswords.slice(1));  // Save after removing the first empty object
        }
      }
    }
  };


  // Handle change in input fields
  const handleChange = (index, field, value) => {
    const newPasswords = [...passwords];
    newPasswords[index][field] = value;
    setPasswords(newPasswords);
  };

  // Filter passwords based on search term
  const filteredPasswords = passwords.filter((item) =>
    item.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Function to copy input value to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
    }).catch((error) => {
      console.error("Error copying text: ", error);
    });
  };




  return (
    <div className='main-page-container'>
      <div className='main-page-content'>
        <div className='main-search-container'>
          <input
            placeholder='Search...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className='main-password-items-container'>
          {filteredPasswords.map((item, index) => (
            <div key={index} className='main-password-item'>
              <div className='input-wrapper'>
                <input
                  value={item.key}
                  placeholder='Key Name'
                  onChange={(e) => handleChange(index, 'key', e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, index)}
                />
                {index !== 0 && (
                  <FaCopy
                    className="copy-icon"
                    onClick={() => copyToClipboard(item.key)}
                  />
                )}

              </div>

              <div className='input-wrapper'>
                <input
                  value={item.password}
                  placeholder='Password'
                  type='password'
                  onChange={(e) => handleChange(index, 'password', e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, index)}
                />
              {index !== 0 && (
                  <FaCopy
                    className="copy-icon"
                    onClick={() => copyToClipboard(item.key)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default Main;
