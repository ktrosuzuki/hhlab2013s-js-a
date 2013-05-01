var Clusters = function () {}
/*
 * 指定されたファイルを読み込む関数
 * ファイルの1行目をcolnames, 1列目をrownames, それ以外をdataに入れて返す
 */
Clusters.prototype.readFile = function (_file,  _callback) {
  var lines = [];

  // とりあえずファイルの中身をぜんぶ読み込む
  var reader = new FileReader();
  reader.readAsText(_file);

  // ファイルを読み込み終わったら呼ばれる関数
  reader.onload = function (e) {
    var colNames = [], rowNames = [], data = [];
    var text = e.target.result;

    // ファイルの中身を改行文字で区切ってlines配列に入れる
    lines = $.trim(text).split('\n');
    
    // 1行目は単語のリスト
    colNames = $.trim(lines[0]).split('\t');
    colNames.splice(0, 1);

 
    // iは1から（ブログの数だけ繰り返す）
    var length = lines.length;
    for (var i = 1; i < length; i++) {
      var p = $.trim(lines[i]).split('\t');
      // それぞれの行の1列目はブログの名前なのでrownamesに追加
      rowNames.push(p[0]);

      // 行の残りの部分がその行のデータ（単語の数だけ繰り返す）
      var tmpArray = [];
      var length_2 = p.length;
      for (var j = 1; j < length_2; j++) {
        tmpArray.push(p[j]);
      }
      data.push(tmpArray);
    }

    _callback([rowNames, colNames, data]);
    return;
  }
}

/*
 * 階層的クラスタリングを実行してくれる関数
 * 
 */
Clusters.prototype.hcluster = function (_rows, _distance) {
  // 距離の定義が指定されていなければとりあえずピアソンにしとく
  if (typeof _distance === 'undefined') {
    var distance = this.pearson;
  } else {
    var distance = _distance;
  }

  var clust = [], self = this;
  // クラスタは最初は行たち
  _rows.forEach(function (value, index) {
    clust.push(self.bicluster(value, null, null, 0.0, index));
  });

  // クラスタが1つになるまで繰り返す
  var distances = {}, currentClustId = -1;
  while (clust.length > 1) {
    var lowestPair = [0, 1];
    var closestDist = distance(clust[0].vec, clust[1].vec);

    // すべての組み合わせをチェックし、最も近い距離のペアを返す
    var length = clust.length;
    for (var i = 0; i < length; i++) {
      for (var j = i + 1; j < length; j++) {
        // 初登場の組み合わせなら距離を計算する
        if (![clust[i].id, clust[j].id] in distances) {
          // 配列をキーに距離を記憶しておく（こんな使い方でいいのかな...）
          // 二次元の配列にして、そこに距離の値を入れていけばいいのでは？初期値は-1とかにしておく。
          distances[[clust[i].id, clust[j].id]] = distance(clust[i].vec, clust[j].vec);
        }

        var d = distances[[clust[i].id, clust[j].id]];

        if (d < closestDist) {
          closestDist = d;
          lowestPair = [i, j];
        }
      }
    }

    // 2つのクラスタの平均を計算する
    var mergeVec = [];
    for (var i = 0; i < clust[0].vec.length; i++) {
      mergeVec.push((clust[lowestPair[0]].vec[i] + clust[lowestPair[1]].vec[i]) / 2.0);
    }

    // 新たなクラスタをつくる
    var newCluster = this.bicluster(mergeVec, clust[lowestPair[0]], clust[lowestPair[1]], closestDist, currentClustId);

    // 元のセットではないクラスタのIDは負にする
    // デンドログラム描く時に区別したいので。
    currentClustId -= 1;
    clust.splice(0, 2);
    clust.push(newCluster);
  }

  console.log('Finish hclustering.');
  return clust[0];
}


/*
 * 配列を2つ受け取り、ピアソン相関係数を返す
 */
Clusters.prototype.pearson = function (v1, v2) {
  var sum1 = 0,
    sum2 = 0,
    sum1Sq = 0,
    sum2Sq = 0,
    pSum = 0;

  // v1とv2の長さは同じ（だとピアソンは信じてる）
  // 違ったらfalseを返す
  var len = (v1.length === v2.length) ? v1.length : -1;
  if (len < 0) return false;

  // for文を1回にまとめた
  for (var i = 0; i < len; i++) {
    // 単純な合計
    sum1 += v1[i];
    sum2 += v2[i];

    // 平方の合計
    sum1Sq += Math.pow(v1[i], 2);
    sum2Sq += Math.pow(v2[i], 2);

    // 積の合計
    pSum += v1[i] * v2[i];
  }

  // ピアソン相関スコアを算出する
  var num = pSum - (sum1 * sum2 / len);
  var den = Math.sqrt((sum1Sq - Math.pow(sum1, 2) / len) * (sum2Sq - Math.pow(sum2, 2) / len));

  if (den === 0) return 0;

  return 1.0 - num / den;
}

/*
 * 新しいクラスタオブジェクトを生成して返す関数
 */
Clusters.prototype.bicluster = function (vec, left, right, distance, id) {
  var Cluster = {
    vec: vec,
    left: left,
    right: right,
    distance: distance,
    id: id
  };
  return Cluster;
}