module.exports = function baseLog(filePath) {

  if (!filePath) {
    throw new Error('filePath required'); 
  }

  return {
    error(...msgs) {
      let sliced = msgs.slice(1, msgs.length);
      console.error(`${filePath}\n`, msgs[0], ...sliced);
    }, 
    info(...msgs) {
      let sliced = msgs.slice(1, msgs.length);
      console.log(`${filePath}\n`, msgs[0], ...sliced);
    } 
  };

};
