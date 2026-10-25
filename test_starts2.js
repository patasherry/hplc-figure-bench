const http = require('https');
http.get('https://www.ncbi.nlm.nih.gov/Taxonomy/Utils/wprintgc.cgi?mode=c', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data.slice(data.indexOf('name="SG11"'), data.indexOf('name="SG11"') + 500)));
});
