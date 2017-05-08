+function($) {
    'use strict'

    var logger = window.console && window.console.log ? window.console : { log: function(){ } }

    var Translation = function(options) {
        options = options || {}
        this.subscriptionKey = options.subscriptionKey
        this.from = options.from || 'ja'
        this.to = options.to || 'en'
        this.excute()
    }

    Translation.targetSelector = 'body *'

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
                timeout: 10000
            }).success(function(data) {
                self.accessToken = data
                self.translate()
            }).error(function() {
                logger.log('fail issue access token')
            })
        },
        translate: function() {
            // Ajaxだとcors問題発生
            // 公式でもscriptタグ埋め込めと言っている
            // https://msdn.microsoft.com/ja-jp/library/ff512407.aspx
            var self = this
            self.setTargetNode()
            var texts = '[' + self.getTargetText() + ']'
            var options = '{"Category": "generalnn"}'
            var src = 'http://api.microsofttranslator.com/V2/Ajax.svc/TranslateArray' +
                '?appId=Bearer ' + self.accessToken +
                '&from=' + self.from +
                '&to=' + self.to +
                '&texts=' + texts +
                '&options=' + options +
                '&oncomplete=translated'
            $('<script>').attr({ 'id': 'translation-script', 'type': 'text/javascript', 'src': src }).data('translation', self).appendTo('body')
            // Tlanslationオブジェクトを使い回すために埋め込む
            // scriptタグの属性に入れてもよかったけどjquery1.6.4だとappendしたscriptタグが見えないためわざわざ別のタグで埋め込んでる
            $('<span>').attr('id','translation-object').data('translation', self).appendTo('body')
        },
        rewrite: function(results) {
            this.nodeList.forEach(function(node, i) {
                node.nodeType === 3 ?
                    node.nodeValue = results[i].TranslatedText :
                    node.value = results[i].TranslatedText
            })
        },
        getTargetSelector: function() {
            return Translation.targetSelector
        },
        setTargetNode: function() {
            var selector = this.getTargetSelector()
            var textNodeList = $(selector).contents().filter(function() {
                return this.nodeType === 3 && !!$.trim(this.nodeValue)
            })
            var inputNodeList = $('input').filter(function() {
                return this.type === 'button' && !!$.trim(this.value)
            })
            this.nodeList = textNodeList.toArray().concat(inputNodeList.toArray())
        },
        getTargetText: function() {
            return this.nodeList.map(function(node) {
                return '"' + (node.nodeType === 3 ? node.nodeValue : node.value) + '"'
            }).join(',')
        }
    }

    function Plugin(options) {
        new Translation(options)
    }

    $.translation = Plugin

    $(function() {
        $('#from-en-to-ja').bind('click', function() {
            var subscriptionKey = $.trim($('#subscription-key').val())
            if(subscriptionKey) $.translation({ subscriptionKey: subscriptionKey, from: 'en', to: 'ja' })
        })
        $('#from-ja-to-en').bind('click', function() {
            var subscriptionKey = $.trim($('#subscription-key').val())
            if(subscriptionKey) $.translation({ subscriptionKey: subscriptionKey, from: 'ja', to: 'en' })
        })
        $(document).bind('translate', function(e, self, data) {
            self.rewrite(data)
        })
    })
}(jQuery)

function translated(data) {
    var translation = $('#translation-object').data('translation')
    $(document).trigger('translate', [translation, data])
    $('#translation-script').remove()
    $('#translation-object').remove()
}
