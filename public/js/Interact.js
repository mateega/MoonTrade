let googleUser;

window.onload = (event) => {
  // Use this to retain user state between html pages.
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      console.log('Logged in as: ' + user.displayName);
      googleUser = user;
    } else {
      window.location = 'signin.html'; // If not logged in, navigate back to login page.
    }
  });
};

// const handleOrderSubmit = () => {
//   // 1. Capture the form data
//   const coin = document.querySelector('#noteTitle');
//   // 2. Format the data and write it to our database
//   firebase.database().ref(`users/${googleUser.uid}`).push({
//     title: noteTitle.value,
//     text: noteText.value
//   })
//   // 3. Clear the form so that we can write a new note
//   .then(() => {
//     noteTitle.value = "";
//     noteText.value = "";
//   });
// };