+function($) {
    'use strict'

    var logger = window.console && window.log ? window.console : { log: function(){ } }

    var Translation = function(options) {
        options = options || {}
        this.subscriptionKey = options.subscriptionKey
        this.from = 'ja'
        this.to = 'en'
        this.excute()
    }

    Translation.prototype = {
        excute: function() {
            this.issueAccessToken()
        },
        issueAccessToken: function() {
            var self = this
            $.ajax({
                type: 'POST',
                url: 'https://api.cognitive.microsoft.com/sts/v1.0/issueToken',
                headers: {
                    'Ocp-Apim-Subscription-Key': self.subscriptionKey
                },
            }).done(function(data) {
                self.accessToken = data
                self.translate()
            }).fail(function() {
                console.log('fail issue access token')
            })
        },
        translate: function() {
            var self = this
            var text = $('#text').text()
            var src = 'http://api.microsofttranslator.com/V2/Ajax.svc/Translate' +
                '?appId=Bearer ' + self.accessToken +
                '&from=' + self.from +
                '&to=' + self.to +
                '&text=' + text +
                '&oncomplete=onTranslate'
            $('<script>').attr({ 'src': src, 'id': 'script-translation' }).data('translation', self).appendTo('body')

            /*
            // Ajaxだとcors問題発生
            // 公式でもscriptタグ埋め込めと言っている
            // https://msdn.microsoft.com/ja-jp/library/ff512385.aspx
            var self = this
            var text = $('#text').text()
            $.ajax({
                type: 'GET',
                url: 'https://api.microsofttranslator.com/V2/Http.svc/Translate',
                category: 'generalnn',
                headers: {
                    'Authorization': 'Bearer ' + self.accessToken
                },
                data: {
                    from: self.from,
                    to: self.to,
                    text: text
                }
            }).done(function(data) {
                console.log(data)
            }).fail(function(e) {
                console.log(e)
                console.log('fail translate')
            })
            */
        },
        rewrite: function(result) {
            $('#result').text(result)
        }
    }

    function Plugin(options) {
        new Translation(options)
    }

    $.translation = Plugin

    $(function() {
        $('#start').on('click', function() {
            var subscriptionKey = $('#subscription-key').val().trim()
            if(subscriptionKey) $.translation({ subscriptionKey: subscriptionKey })
        })
    })
}(jQuery)

function onTranslate(data) {
    var translation = $('#script-translation').data('translation')
    translation.rewrite(data)
}
