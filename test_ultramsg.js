
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'server/.env') });

const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
const token = process.env.ULTRAMSG_TOKEN;
const to = process.env.ADMIN_MOBILE || "919750534434";

console.log("Instance ID:", instanceId);
console.log("Token:", token);
console.log("To:", to.replace(/\D/g, ''));

const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
const body = "Test message from NiKii Digital Debugger";

async function test() {
  const params = new URLSearchParams();
  params.append("token", token);
  params.append("to", to.replace(/\D/g, ''));
  params.append("body", body);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    const result = await resp.json();
    console.log("Result:", result);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
