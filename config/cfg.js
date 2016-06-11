'use strict'; 

var cfg = {

  ignoreExpiry:   0, // ignores deadlines
  allowCurlAjax:  1, // allow a curl request sent to an ajax-only route
  allowCurlAuth:  0, // allow a curl request sent to an authorised route
  allowCurlAdmin: 0, // allow a curl request sent to an admin-only route
  allowCurlAnon:  0  // allow a curl request send to an anon-only route
  
}

module.exports = cfg;