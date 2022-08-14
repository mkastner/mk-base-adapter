module.exports = function handleValidationError(err) {
  if (err.name !== 'ValidationError') return false; 
  const errorObj = {
    error: { 
      name: err.name,
      message: 'Fehler bei der Datenspeicherung'
    }
  };
  if (err.errors) {
    errorObj.error.errors = {}; 
    for (let key in err.errors) {
      errorObj.error.errors[key] = {}; 
      errorObj.error.errors[key].message = err.errors[key].message; 
      errorObj.error.errors[key].name = err.errors[key].name; 
    }
  }
  return errorObj;
}

