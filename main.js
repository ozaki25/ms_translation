+function($) {
    'use strict'

    var logger = window.console && window.console.log ? window.console : { log: function(){ } }

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
                logger.log('fail issue access token')
            })
        },
        translate: function() {
            // Ajaxだとcors問題発生
            // 公式でもscriptタグ埋め込めと言っている
            // https://msdn.microsoft.com/ja-jp/library/ff512407.aspx
            var self = this
            var text = $('#text').text()
            var texts = '["こんにちは", "私はポー太郎です", "私はポー太郎ではありません"]'
            var src = 'http://api.microsofttranslator.com/V2/Ajax.svc/TranslateArray' +
                '?appId=Bearer ' + self.accessToken +
                '&from=' + self.from +
                '&to=' + self.to +
                '&texts=' + texts +
                '&categoryID=generalNN' +
                '&oncomplete=onTranslate'
            $('<script>').attr({ 'src': src, 'id': 'script-translation' }).data('translation', self).appendTo('body')
        },
        rewrite: function(results) {
            var resultText = $.map(results, function(result) {
                return result.TranslatedText
            }).join(', ')
            $('#text').text(resultText)
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
        $(document).on('translate', function(e, self, data) {
            self.rewrite(data)
        })
    })
}(jQuery)

function onTranslate(data) {
    var translation = $('#script-translation').data('translation')
    $(document).trigger('translate', [translation, data])
    $('#script-translation').remove()
}
