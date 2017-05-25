+function($) {
    'use strict'

    var logger = window.console && window.console.log ? window.console : { log: function(){ } }

    var Translation = function(options) {
        options = options || {}
        this.subscriptionKey = options.subscriptionKey
        this.from = options.from || 'ja'
        this.to = options.to || 'en'
        this.nodeList = []
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
            var timeout = 20000

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
            var self = this
            self.setTargetNode()
            $.each(self.nodeList, function(i, nodeListBlock) {
                self.createCallback(i)
                var texts = '[' + self.getTargetText(nodeListBlock) + ']'
                var options = '{"Category": "generalnn"}'
                var src = 'https://api.microsofttranslator.com/V2/Ajax.svc/TranslateArray' +
                    '?appId=Bearer ' + encodeURIComponent(self.accessToken) +
                    '&from=' + encodeURIComponent(self.from) +
                    '&to=' + encodeURIComponent(self.to) +
                    '&texts=' + encodeURIComponent(texts) +
                    '&options=' + encodeURIComponent(options) +
                    '&oncomplete=translated' + i
                $('<script>').attr({ 'id': 'translation-script-' + i, 'type': 'text/javascript', 'src': src }).appendTo('body')
                // Tlanslationオブジェクトを使い回すために埋め込む
                // scriptタグの属性に入れてもよかったけどjquery1.6.4だとappendしたscriptタグが見えないためわざわざ別のタグで埋め込んでる
                $('<span>').attr('id','translation-object-' + i).data('translation', self).appendTo('body')
            })
        },
        createCallback: function(i) {
            var callbackName = 'translated' + i
            window[callbackName] = function(data) {
                var translation = $('#translation-object-' + i).data('translation')
                $(document).trigger('translate', [translation, data, i])
                $('#translation-script-' + i).remove()
                $('#translation-object-' + i).remove()
                delete window[callbackName]
            }
        },
        rewrite: function(results, i) {
            $.each(this.nodeList[i], function(j, node) {
                node.nodeType === 3 ?
                    node.nodeValue = results[j].TranslatedText :
                    node.value = results[j].TranslatedText
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
            var totalNode = textNodeList.toArray().concat(inputNodeList.toArray())
            // 送信量の上限は、要素数:2000、文字数:10000
            // https://msdn.microsoft.com/ja-jp/library/ff512407.aspx#parameters
            // 文字数チェックしたあとnode分割はきついから少なめの要素数で分割して対応
            var size = 100
            for(var i = 0; i < Math.ceil(totalNode.length / size); i++) {
                this.nodeList.push(totalNode.slice(i * size, i * size + size))
            }
        },
        getTargetText: function(nodeList) {
            return $.map(nodeList, function(node) {
                var text = node.nodeType === 3 ? $.trim(node.nodeValue) : $.trim(node.value)
                // 改行があると翻訳処理でエラーがでるので諦めて半角スペースに変換
                return '"' + text.replace(/\r?\n/g, ' ') + '"'
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
        $(document).bind('translate', function(e, self, data, i) {
            self.rewrite(data, i)
        })
    })
}(jQuery)
