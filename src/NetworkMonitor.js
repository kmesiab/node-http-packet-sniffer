"use strict";
var page            = require("webpage").create();
var uri             = require("url");
var querystring     = require("querystring");
/**

    Network Monitor
    Initiates a headless request to the url specified using 
    phantomJs.  All outbound resource requests are captures
    raw and passed to the callback.


    @param {opts} Optional parameters to control
    how the request is generated.  The following
    options are available:

    {
        "filter" : {
            "type" : ["css", "js", "png"],
            "domain" : ["www.rei.com", "doubleclick.com"],

        }
    }


    Note: The Network Monitor will capture *all* resources, 
          including images, scripts and css files.
 

        @TODO: Capture and merge request with the related response.
 
*/
function NetworkMonitor(args) {

    var opts = args || {};

    /**

        Array containing the reuslts of the capture

    */
    var results = [];

    /**

        Array containing javascript errors found
        during the page request

    */
    var errors = [];

    /**
    
        Returns true if javascript errors ocurred
        during the page request.

    */
    this.haserrors = function() {
        return errors.length > 0;
    };

    /**
    
        geterrors() returns an array of
        javascript errors that occurred during the
        page request.

    */
    this.geterrors = function() {
        return errors;
    };

    /**
    
        getResults() returns an array of HTTP
        request objects received in the previous
        request.

    */
    this.getResults = function() {
        return results;
    };

    /**
        @returns int
        
        The total number of requests issued
        this session.
    */
    this.totalRequests = function() {
        return results.length;
    };

    /**
        
        Event emitted when an error ocurrs during
        the fetching of a page.

        @param {error} The error object returned
                       by the request for a page.
                       This is usually a javascript
                       error on the page itself.

    */
   this.error;


    /**
    
        Monitors the resources request made by the page
        object and captures  errors that occur.

        These errors are stored in the errors property
        and can be retrieved using .geterrors or you can
        check for errors by using .haserrors

        @param { e } The error object passed by PhantomJs

    */
    page.onResourceError = function( e ) {

        errors.push(e);

        if( this.error && typeof this.error === "function" ) {

            this.error(e);

        }

    };
    /**
    
        Captures global errors that occur.

        These errors are stored in the errors property
        and can be retrieved using .geterrors or you can
        check for errors by using .haserrors

        @param { e } The error object passed by PhantomJs

    */
    page.onError = function(msg, trace) {

        var e = {

            "message" : msg,
            "trace"   : trace

        };

        if( this.error && typeof this.error === "function") {

            this.error(e);

        }

    };

    /**
    
        Fired when the PhantomJs configured timeout elapsed
        while trying to retrieve a resource.

        @param { e } The error object passed by PhantomJs

    */
    page.onResourceTimeout = function(e) {

        errors.push(e);

        if( this.error && typeof this.error === "function") {

            this.error(e);

        }

    };

    /**

        Monitors the resources requests made by the 
        page object and stores them in an array.

        The array is supplied 

        @param {req} Contains the HTTP Request object.

    */
    page.onResourceRequested = function(req) {

        try { 

            // Parse the actual url into a node URL object
            req.uri = uri.parse(req.url) || req.uri;   
            req.cookies = page.cookies;

            // Test to see if this request type
            // is filtered out of the responses
            if( filter( req ) ) {
                return;
            }

            // Replace the query parameter of the uri object 
            // with a parsed querystring object
            if( req.uri && req.uri.query !== null ) {

                req.data =  querystring.parse(req.uri.query) || {};     

            // If we can't get the values from the querystring
            // because the vendor is weird, sometimes we can
            // extract it from the path.
            } else if ( req.uri.path.search(/&/) > -1 ) {

                req.data = querystring.parse( req.uri.path );

            }

            results.push(req);                                      


        } catch (e) {

            errors.push(e);

            if( this.error && typeof this.error === "function" ) {
                this.error(e);
            }

        }

    };


    /**
        
        Uses filters defined in opts to 
        determine if a given request should
        be filtered out or not.

    */
    var filter = function( req ) {

        // No filters, invalid uri or path
        if( ! opts.filter || ! req.uri || ! req.uri.path ) {
            return false;   
        }


        // Filter by domain
        if( opts.filter.domain ) {

            var domain_found = opts.filter.domain.indexOf(req.uri.host) > -1;

            if( domain_found ) {

                return true;

            }
        }

        // Filter by extension
        if( opts.filter.type ) {
            

            // Get the last period and how many letters are after it
            var start = req.uri.path.lastIndexOf(".");
            var count = req.uri.path.length - start;


            // If there was no dot, 
            // something weird is up...
            if( start < 0 ) {
                return false;
            }

            // Extract the extension and see if it's filtered
            var extension = req.uri.path.slice(start, count);
            var path_found = opts.filter.type.indexOf(extension) > -1;
            
            if( path_found ) {

                return true;

            }

        }

        // Default, don't filter
        return false;

    };


    /**

        Opens the requested page supplied in the args.
        Pause for [ttl] ms to allow the page to 
        fully complete page rendering, including 
        scripts, images, js dom changes.
        
        @param {address} The url to request
        @param {status}  The callback receives
                         An array of HTTP page 
                         resource requests

        @param {cb} supplied in the constructor will
                    will be passed the array of HTTP
                    requests, and the page object that
                    initiated the request.



    */
    this.fetch = function( address, cb ) {


        // reset the results of the last requst
        // if one was made, of course
        results = [];
        errors  = [];

        // request the page, then set a timeout
        // for the rest of the page to load.
        page.open( address , function( status ) {


            if( cb && typeof cb === "function" ) {

                cb({

                    "address"       : address,
                    "status"        : status,
                    "results"       : results,
                    "errors"        : errors,
                    "hasErrors"   : errors.length > 0
                    
                 });

            }

            phantom.exit();

        });

    };
}
/* end NetworkMonitor */
module.exports = {
    "create" : function(args) {
        return new NetworkMonitor(args);
    }
}
