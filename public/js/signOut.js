const signOut = () => {
    firebase.auth().signOut().then(function() {
    console.log('Signed Out');
    }, function(error) {
    console.error('Sign Out Error', error);
    });
}

firebase.auth().onAuthStateChanged(function(user) {
if (user) {
console.log('Logged in as: ' + user.displayName);
googleUser = user;
} else {
window.location = 'signin.html'; // If not logged in, navigate back to login page.
}
});