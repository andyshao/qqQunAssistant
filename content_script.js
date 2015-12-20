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

//初始化数据库
function initWebSQL() {
    var db = openDatabase('qunDB', '1.0', 'QQ群助手数据库', 10 * 1024 * 1024);
    db.transaction(function (tx) {
        //todo:重新构建表
        tx.executeSql('drop table if exists groups');
        tx.executeSql('CREATE TABLE IF NOT EXISTS groups (auth,flag,groupid,groupname,alpha,bbscount,class,create_time,filecount,finger_memo,group_memo,level,option,total)');
        tx.executeSql('drop table if exists members');
        tx.executeSql('CREATE TABLE IF NOT EXISTS members (groupid,iscreator,ismanager,nick,uin)');
    });
    return db;
}
function saveGroups(db, data) {
    debugOutput('正在保存群列表数据...');
    $.each(data.group, function (i, n) {
        db.transaction(function (tx) {
            tx.executeSql('INSERT INTO groups(auth,flag,groupid,groupname) VALUES('
                + n.auth + ',' + n.flag + ',' + n.groupid + ',\'' + n.groupname + '\')');
        });
        //延迟调用，否则服务器可能返回错误。
        setTimeout(function () {
            getMemberByGroupId(db, n.groupid);
        }, 200);
    });
}
//获取成员列表保存到数据库
function getMemberByGroupId(db, groupId) {
    $.ajax({
        url: api_url.groupMember,
        data: {
            uin: uin,
            g_tk: api_token,
            ua: navigator.userAgent,//不是必备的
            callbackFun: 'member',
            groupid: groupId
        },
        dataType: 'jsonp',//必须设置为jsonp才会回调
        jsonpCallback: 'member_Callback',
        success: function (resp, textStatus, jqXHR) {
            db.transaction(function (tx) {
                //更新群信息
                var sql = 'update groups set [alpha]=' + resp.data.alpha + ',[bbscount]=' + resp.data.bbscount + ',[class]=' + resp.data.class + ',[create_time]=' + resp.data.create_time + ',filecount=' + resp.data.filecount + ',finger_memo=\'' + resp.data.finger_memo + '\',group_memo=\'' + resp.data.group_memo + '\',level=' + resp.data.level + ',option=' + resp.data.option + ',total=' + resp.data.total + ' where groupid=' + groupId;
                tx.executeSql(sql);
                $.each(resp.data.item, function (j, m) {
                    //插入成员信息
                    sql = ' INSERT INTO members (groupid,iscreator,ismanager,uin,nick) VALUES(' + groupId + ','
                        + m.iscreator + ',' + m.ismanager + ',' + m.uin + ',\'' + m.nick + '\')';
                    tx.executeSql(sql);
                });
            });
        }
    });
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
            var db = initWebSQL();
            saveGroups(db, data);
        });
})(jQuery);