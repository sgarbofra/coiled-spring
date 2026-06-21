// Quick test of scanner endpoint
fetch('http://localhost:8001/api/scanner/leaps?underlyings=SPY&option_type=call&dte_min=300&dte_max=750&delta_min=0.2&delta_max=0.45')
  .then(r => {
    console.log('Status:', r.status);
    return r.text();
  })
  .then(text => {
    console.log('Response preview:', text.substring(0, 200));
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      console.log('ERROR: Receiving HTML instead of JSON - backend error!');
    } else {
      console.log('Response is JSON');
    }
  })
  .catch(e => console.error('Fetch error:', e));
