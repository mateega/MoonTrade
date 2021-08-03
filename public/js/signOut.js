const signOut = () => {
    firebase.auth().signOut().then(function() {
    window.location = 'signin.html';
    console.log('Signed Out');
    }, function(error) {
    console.error('Sign Out Error', error);
    });
}