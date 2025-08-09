const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    console.log(`User is authenticated, proceeding to the next middleware/route handler. Session ID: ${req.sessionID}`)
    return next() // User is authenticated, proceed to the next middleware/route handler
  } else {
    console.error('User is not authenticated. Error: Unauthorized access attempt.')
    console.error(`Failed session ID: ${req.sessionID}`)
    return res.status(401).send('You are not authenticated') // User is not authenticated
  }
}

module.exports = {
  isAuthenticated
}
