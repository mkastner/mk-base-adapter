module.exports = function endsWith(fullString, endString) {

  if (!fullString) return false;
  if (!endString) return false;

  const ending = fullString.slice(fullString.length - endString.length);  

  if (ending && ending === endString) {
    return fullString.slice(0, fullString.length - endString.length);
  }

  return false;

};
