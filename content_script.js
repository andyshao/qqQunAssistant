var api_token;
var uin;

function debugOutput(msg) {
    console.log('QQ群助手：' + msg);
}

//从dom中获取api token
function getApiToken() {
    $('body script').each(function (i, tag) {
        var matches = /g_tk=([^&]*)/.exec(tag.src);
        if (matches && matches.length > 1) {
            api_token = matches[1];
            return false;
        }
    });
    uin = $('img.avatar').attr('uin');
    debugOutput('api token[' + api_token + '],uin[' + uin + ']');
}

var api_url = {
    //群组列表
    groupList: 'http://qun.qzone.qq.com/cgi-bin/get_group_list'
    //群组成员
    , groupMember: 'http://qun.qzone.qq.com/cgi-bin/get_group_member'
    //文件列表
    , groupShareList: 'http://qun.qzone.qq.com/cgi-bin/group_share_list'
};

debugOutput('content script load');

(function ($) {
    getApiToken();
    $.Deferred(function (defer) {
        //获取群组列表
        $.ajax({
            url: api_url.groupList,
            data: {
                uin: uin,
                g_tk: api_token,
                ua: navigator.userAgent,//不是必备的
                callbackFun: 'groupList'
            },
            dataType: 'jsonp',//必须设置为jsonp才会回调
            jsonpCallback: 'groupList_Callback',
            success: function (resp, textStatus, jqXHR) {
                defer.resolve(resp.data);
            }
        });
    })
        .then(function (data) {
            var db = openDatabase('qunDB', '1.0', 'QQ群助手数据库', 10 * 1024 * 1024);
            db.transaction(function (tx) {
                tx.executeSql('CREATE TABLE IF NOT EXISTS groups (auth,flag,groupid,groupname)');
            });
            debugOutput('正在保存群列表数据...');
            $.each(data.group, function (i, n) {
                db.transaction(function (tx) {
                    tx.executeSql('INSERT INTO groups(auth,flag,groupid,groupname) VALUES('
                        + n.auth + ',' + n.flag + ',' + n.groupid + ',\'' + n.groupname + '\')');
                });
            });
        });



})(jQuery);