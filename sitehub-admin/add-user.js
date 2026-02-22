// Quick script to add your user
// Run: node add-user.js

const userEmail = "steven_hukelight@yahoo.co.uk";
const userName = "Steven Huke-Light";
const userRole = "ADMIN";

fetch('http://localhost:3001/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: userEmail,
    name: userName,
    role: userRole,
  }),
})
  .then(res => res.json())
  .then(data => {
    console.log('User added successfully:', data);
    console.log('Email:', userEmail);
    console.log('Name:', userName);
    console.log('Role:', userRole);
  })
  .catch(err => {
    console.error('Error adding user:', err);
  });
