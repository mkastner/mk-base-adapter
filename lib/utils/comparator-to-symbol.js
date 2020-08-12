module.exports = function comparatorToSymbol(comp) {

  if (comp === 'gt') {
    return '>';
  } else if (comp === 'lt') {
    return '<';
  } else if (comp === 'gte') {
    return '>='; 
  } else if (comp === 'lte') {
    return '<='; 
  }
  return '=';

};
