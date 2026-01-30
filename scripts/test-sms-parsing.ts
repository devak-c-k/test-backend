
import fetch from 'node-fetch';

async function testSMSParsing() {
  const API_URL = 'http://localhost:3000/api/parse-sms';
  
  const testCases = [
    {
      sender: 'HDFCBK',
      message: 'Rs. 1,250.00 debited from a/c **1234 to Zomato UPI on 25-01-25. Avl Bal: Rs. 15,000.00.'
    },
    {
      sender: 'ICICIB',
      message: 'Acct XX8888 credited with Rs 50,000.00 on 30-Jan-25. Info: SALARY. Avbl Bal: Rs 1,50,000.'
    },
    {
      sender: 'AXISBK',
      message: 'OTP for txn is 123456. Do not share this with anyone.'
    },
    {
      sender: 'JM-BOIIND-S',
      message: 'BOI -  Rs.1.00 Credited to your Ac XX0983 on 30-01-26 by UPI ref No.603107874045.Avl Bal 48.69'
    }
  ];

  console.log('Testing SMS Parsing API...');

  for (const test of testCases) {
    console.log(`\n-----------------------------------`);
    console.log(`Sending SMS: "${test.message}"`);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test)
      });
      
      const data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

testSMSParsing();
