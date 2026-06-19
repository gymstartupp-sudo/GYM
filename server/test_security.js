const runTests = async () => {
  const url = 'http://localhost:5001/api/auth/check-exists';
  
  const testCases = [
    {
      name: 'Normal clean email request',
      payload: { email: 'nonexistent_test@gymplatform.com' },
      expectedStatus: 200
    },
    {
      name: 'Object instead of string',
      payload: { email: { abc: 'test' } },
      expectedStatus: 400
    },
    {
      name: 'Array instead of string',
      payload: { email: ['test@gmail.com'] },
      expectedStatus: 400
    },
    {
      name: 'Email with $gt operator',
      payload: { email: { $gt: '' } },
      expectedStatus: 400
    },
    {
      name: 'Email with $where operator',
      payload: { email: { $where: 'true' } },
      expectedStatus: 400
    },
    {
      name: 'Phone with $regex operator',
      payload: { phone: { $regex: '.*' } },
      expectedStatus: 400
    },
    {
      name: 'Nested operator',
      payload: { profile: { email: { $gt: '' } } },
      expectedStatus: 400
    },
    {
      name: 'Prototype pollution',
      rawBody: '{"__proto__": {"isAdmin": true}}',
      expectedStatus: 400
    }
  ];

  console.log('--- STARTING SECURITY HARDENING TESTS ---');
  for (const tc of testCases) {
    try {
      const bodyContent = tc.rawBody || JSON.stringify(tc.payload);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyContent
      });
      
      const resData = await res.json().catch(() => ({}));
      const success = res.status === tc.expectedStatus;
      
      console.log(`[${success ? 'PASS' : 'FAIL'}] ${tc.name}`);
      console.log(`      Payload:  ${bodyContent}`);
      console.log(`      Status:   Expected ${tc.expectedStatus}, Got ${res.status}`);
      console.log(`      Response: ${JSON.stringify(resData)}`);
      console.log('-----------------------------------------');
    } catch (err) {
      console.log(`[ERROR] ${tc.name}: ${err.message}`);
    }
  }
};

runTests();
