'use strict'; 

var cfg = {

  ignoreExpiry:   true, // ignores deadlines
  allowCurlAjax:  true, // allow a curl request sent to an ajax-only route
  allowCurlAuth:  true, // allow a curl request sent to an authorised route
  allowCurlAdmin: true, // allow a curl request sent to an admin-only route
  allowCurlAnon:  true  // allow a curl request send to an anon-only route
  
}

module.exports = cfg;