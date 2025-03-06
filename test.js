const encrypt = (qrContent, secretMessage) => {
  let result = "";
  const maxLength = Math.max(qrContent.length, secretMessage.length);

  if (maxLength > qrContent.length) {
    qrContent = qrContent.padEnd(maxLength, qrContent);
  } else {
    qrContent = qrContent.slice(0, maxLength);
  }

  // XOR each character code of both padded strings
  for (let i = 0; i < qrContent.length; i++) {
    const charCode1 = qrContent.charCodeAt(i);
    const charCode2 = secretMessage.charCodeAt(i);
    result += String.fromCharCode(charCode1 ^ charCode2);
  }

  return result;
};

const decrypt = (encryptedMessage, qrContent) => {
  let result = "";
  let paddedQR = qrContent;

  //   check difference between encrypted message and qr content
  const maxLength = Math.max(encryptedMessage.length, qrContent.length);

  if (encryptedMessage.length > qrContent.length) {
    paddedQR = qrContent.padEnd(maxLength, qrContent);
  } else {
    paddedQR = qrContent.slice(0, maxLength);
  }
  // XOR to decrypt
  for (let i = 0; i < encryptedMessage.length; i++) {
    const charCode1 = encryptedMessage.charCodeAt(i);
    const charCode2 = paddedQR.charCodeAt(i);
    result += String.fromCharCode(charCode1 ^ charCode2);
  }

  return result;
};

// Example usage
const qrContent = "HELLOWORLD";
const secretMessage = "ENCRYPTION";

console.log("Original QR Content:", qrContent);
console.log("Original Secret Message:", secretMessage);

const encryptedMessage = encrypt(qrContent, secretMessage);
console.log("Encrypted Message:");
console.log(encryptedMessage);
// Console in a way that it is visible
console.log(encryptedMessage.length);

const decryptedMessage = decrypt(encryptedMessage, qrContent);
console.log("Decrypted Message:");
console.log(decryptedMessage);
