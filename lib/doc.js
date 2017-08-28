var _       = require('lodash');
var path    = require('path');
var express = require('express');
var service = require('bi-service');

var swagger = require('./swagger');

var App = service.App;
module.exports.Doc = Doc;

/**
* @param {AppManager} appManager
* @param {Config} cfg - config
* @param {Object} [options]
* @param {App} [options.app] - the app object a Doc is created for
*
* @constructor
**/
function Doc(appManager, cfg, options) {

    options = _.assign({
        name: cfg.get('name'),
    }, options || {});

    this.app = options.app;
    //must be deleted as the App object would get corrupted by parent constructor
    delete options.app;

    cfg.setInspectionSchema({
        type: 'object',
        required: ['name'],
        properties: {
            listen: {type: ['integer', 'string']},
            name: {type: 'string'},
            title: {type: 'string'},
            tryItOut: {type: 'boolean'}
        }
    });

    if (!cfg.get('bodyParser')) {
        cfg.set('bodyParser', {
            // dont allow complex json data structures encoded in url
            json: {extended: false}
        });
    }

    App.call(this, appManager, cfg, options);
}

Doc.prototype = Object.create(App.prototype);
Doc.prototype.constructor = Doc;
Doc.prototype._super = App.prototype;

/**
 * @return {undefined}
 */
Doc.prototype.$init = function() {

    this._super.$init.call(this);

    this.on('post-init', function() {
        var docApp  = this,
            app     = this.app;

        app.doc = docApp;

        this.expressApp.set('views', path.join(__dirname, '/../views'));
        this.expressApp.set('view engine', 'ejs');
        this.use('/public', express.static(path.join(__dirname, '/../public')));

        try{
            var specs = swagger.generate(app);
        } catch(e) {
            this.emit('error', e);
        }

        var router = docApp.buildRouter({
            routeNameFormat: '{method}{Name}',
            url: '/'
        });

        router.buildRoute({
            type: 'get',
            url: '/'
        }).main(function(req, res) {
            res.render('index.ejs', {
                title: docApp.config.get('title') || 'API documentation',
                tryItOut: docApp.config.get('tryItOut') || false
            });
        });

        router.buildRoute({
            type: 'get',
            url: '/specs'
        }).main(function(req, res) {
            res.json(specs);
        });
    });
};
