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
            var url = 'https://api.cognitive.microsoft.com/sts/v1.0/issueToken?Subscription-Key=' + self.subscriptionKey
            var onSuccess = function(result) {
                logger.log('success issue access token')
                self.accessToken = result
                self.translate()
            }
            var onError = function() {
                logger.log('fail issue access token')
            }
            var timeout = 10000

            if(window.XDomainRequest) {
                var xdr = new XDomainRequest();
                xdr.onload = function() {
                    onSuccess(xdr.responseText)
                }
                xdr.onerror = onError
                xdr.timeout = timeout
                xdr.open('post', url)
                xdr.send()
            } else {
                $.ajax({
                    type: 'post',
                    url: url,
                    timeout: timeout
                }).success(onSuccess).error(onError)
            }
        },
        translate: function() {
            // Ajaxだとcors問題発生
            // 公式でもscriptタグ埋め込めと言っている
            // https://msdn.microsoft.com/ja-jp/library/ff512407.aspx
            this.setTargetNode()
            var texts = '[' + this.getTargetText() + ']'
            var options = '{"Category": "generalnn"}'
            var src = 'https://api.microsofttranslator.com/V2/Ajax.svc/TranslateArray' +
                '?appId=Bearer ' + this.accessToken +
                '&from=' + this.from +
                '&to=' + this.to +
                '&texts=' + texts +
                '&options=' + options +
                '&oncomplete=translated'
            $('<script>').attr({ 'id': 'translation-script', 'type': 'text/javascript', 'src': src }).appendTo('body')
            // Tlanslationオブジェクトを使い回すために埋め込む
            // scriptタグの属性に入れてもよかったけどjquery1.6.4だとappendしたscriptタグが見えないためわざわざ別のタグで埋め込んでる
            $('<span>').attr('id','translation-object').data('translation', this).appendTo('body')
        },
        rewrite: function(results) {
            $.each(this.nodeList, function(i, node) {
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
            return $.map(this.nodeList, function(node) {
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
