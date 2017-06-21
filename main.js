+function($) {
    'use strict'

    var logger = window.console && window.console.log ? window.console : { log: function(){ } }

    var Translation = function(options) {
        options = options || {}
        this.subscriptionKey = options.subscriptionKey
        this.from = options.from || 'ja'
        this.to = options.to || 'en'
        this.omitSelector = options.omitSelector ? options.omitSelector + ',script' : 'script'
        this.nodeList = []
        this.excute()
    }

    Translation.prototype = {
        excute: function() {
            this.setup()
            this.hasTranslatedInLocalStorage() ? this.useLocalStorageData() : this.issueAccessToken()
        },
        setup: function() {
            this.setTargetNode()
            this.setLocalStorage()
        },
        useLocalStorageData: function() {
            var key = window.location.href + this.from + this.to
            var values = JSON.parse(localStorage.getItem(key))
            var count = 0
            logger.log('use localstorage data')
            $.each(this.nodeList, function(i, nodeListBlock) {
                $.each(nodeListBlock, function(j, node) {
                    node.nodeType === 3 ?
                        node.nodeValue = values[count] :
                        node.value = values[count]
                    count++;
                })
            })
        },
        issueAccessToken: function() {
            var self = this
            var url = 'https://api.cognitive.microsoft.com/sts/v1.0/issueToken?Subscription-Key=' + self.subscriptionKey
            var onSuccess = function(result) {
                self.accessToken = result
                self.translate()
            }
            var onError = function(data, status, error) {
                logger.log(status)
                logger.log(error)
            }
            var timeout = 20000

            // IE9の場合はXDRを使う
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
            // htmlにscriptタグを埋め込んでテキストを送信する
            // https://msdn.microsoft.com/ja-jp/library/ff512407.aspx
            var self = this
            $.each(self.nodeList, function(blockNumber, nodeListBlock) {
                self.createCallback(blockNumber)
                var texts = '[' + self.getTargetText(nodeListBlock) + ']'
                var options = '{"Category": "generalnn"}'
                var src = 'https://api.microsofttranslator.com/V2/Ajax.svc/TranslateArray' +
                    '?appId=Bearer ' + encodeURIComponent(self.accessToken) +
                    '&from=' + encodeURIComponent(self.from) +
                    '&to=' + encodeURIComponent(self.to) +
                    '&texts=' + encodeURIComponent(texts) +
                    '&options=' + encodeURIComponent(options) +
                    '&oncomplete=translated' + blockNumber
                $('<script>').attr({ 'id': 'translation-script-' + blockNumber, 'type': 'text/javascript', 'src': src }).appendTo('body')
                // Tlanslationオブジェクトを使い回すために埋め込む
                // scriptタグの属性に入れてもよかったけどjquery1.6.4だとappendしたscriptタグが見えないためわざわざ別のタグで埋め込んでる
                $('<span>').attr('id','translation-object-' + blockNumber).data('translation', self).appendTo('body')
            })
        },
        createCallback: function(blockNumber) {
            var callbackName = 'translated' + blockNumber
            // 翻訳後に呼ばれるグローバルな関数を動的に生成
            window[callbackName] = function(results) {
                var translation = $('#translation-object-' + blockNumber).data('translation')
                $(document).trigger('translate', [translation, results, blockNumber])
                $('#translation-script-' + blockNumber).remove()
                $('#translation-object-' + blockNumber).remove()
                delete window[callbackName]
            }
        },
        rewrite: function(results, blockNumber) {
            $.each(this.nodeList[blockNumber], function(i, node) {
                node.nodeType === 3 ?
                    node.nodeValue = results[i].TranslatedText :
                    node.value = results[i].TranslatedText
            })
        },
        setTargetNode: function() {
            var textNodeList = $('body *').not(this.omitSelector).contents().filter(function() {
                return this.nodeType === 3 && !!$.trim(this.nodeValue)
            })
            var inputNodeList = $('input').filter(function() {
                return this.type === 'button' && !!$.trim(this.value)
            })
            var totalNode = textNodeList.toArray().concat(inputNodeList.toArray())
            // 送信量の上限は、要素数:2000、文字数:10000
            // https://msdn.microsoft.com/ja-jp/library/ff512407.aspx#parameters
            // 一度に送信する量が多いと環境によってはブラウザが固まるので少なめに設定
            var size = 30
            for(var i = 0; i < Math.ceil(totalNode.length / size); i++) {
                this.nodeList.push(totalNode.slice(i * size, i * size + size))
            }
        },
        getTargetText: function(nodeList) {
            return $.map(nodeList, function(node) {
                var text = node.nodeType === 3 ? $.trim(node.nodeValue) : $.trim(node.value)
                // 改行があると翻訳処理でエラーがでるので半角スペースに変換
                return '"' + text.replace(/\r?\n/g, ' ') + '"'
            }).join(',')
        },
        setLocalStorage: function() {
            var key = window.location.href + this.to + this.from
            var nodeValues = $.map(this.nodeList, function(nodeListBlock) {
                return $.map(nodeListBlock, function(node) {
                    return node.nodeType === 3 ? node.nodeValue : node.value
                })
            })
            localStorage.setItem(key, JSON.stringify(nodeValues))
        },
        hasTranslatedInLocalStorage: function() {
            var key = window.location.href + this.from + this.to
            return !!localStorage[key]
        },
    }

    function Plugin(options) {
        new Translation(options)
    }

    $.translation = Plugin

    $(function() {
        $(document).bind('translate', function(e, translation, results, blockNumber) {
            translation.rewrite(results, blockNumber)
        })
    })
}(jQuery)
