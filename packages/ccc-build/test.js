let path = require("path");
let fs = require("fs");
let walk = require("walk");
let tinypng = require("./tinypng");
let UglifyJS = require("uglify-js");

const project = "/Users/Leo/Documents/C_Code/HongDou/gong4-client";
const root = project + "/web-build/web-mobile";

tinypng("/Users/Leo/Downloads/WechatIMG9.jpeg");

// let walker = walk.walk(root, {
// 	followLinks: false
// });

// walker.on('file', function (roots, stat, next) {
// 	let path = roots + '/' + stat.name;
// 	if (/\.(png|jpg|jpeg)$/i.test(path)) {
// 		// tinypng(path, project + '/tinypng-cache', (error, result) => {
// 		// 	if (!error) {
// 		// 		fs.writeFileSync(path, result);
// 		// 	} else {
// 		// 		Editor.log(error);
// 		// 	}
// 		// 	next();
// 		// });
// 		next();
// 	} else if ((/\.(js)$/i.test(path))) {
// 		// Editor.log(stat.name);
// 		// Editor.log(stat.name.indexOf('project'));
// 		if (stat.name.indexOf('project') == 0) {

// 			let options = {
// 				warnings: true,
// 				compress: {
// 					// compress options
// 					global_defs: {
// 						// "@alert": "Editor.log"
// 					},
// 					pure_funcs: ['cc.log', 'cc.error', 'cc.info']
// 				},
// 				output: {
// 					quote_style: 1,
// 				}

// 			};

// 			let code = fs.readFileSync(path);
// 			let result = UglifyJS.minify(code.toString(), options);
// 			// Editor.log(result.code);
// 			// let ast = recast.parse(code);
// 			// Editor.log(ast);
// 			// Editor.log(ast.program.body);

// 		}
// 		next();
// 	} else {
// 		next();
// 	}
// });

// walker.on('end', function () {
// 	Editor.log("over");
// });

// // var source = '<div style="a:a; b:b; c:c" width=10% width=10% height="dd"></div>';
// //
// // //删除width属性及值。
// // Editor.log(source.replace(/tooltip=".*?"|width=.*?(?=\s|>)/,''));
// //
// // //删除style属性中的键值对b和c
// // Editor.log(source.replace(/(style=)(".*?")/,function(m,g1,g2){
// //     Editor.log(g1);
// //     Editor.log(g2);
// //
// //     return g1 + ['"',g2.replace(/(?:;|")\s*(.*?):(.*?)(?=;|")/g,function(m,g1,g2){
// //
// //         // 删除b属性和c属性 要改成其他属性可以在这里控制
// //         if(/^(a|b)$/.test(g1))
// //             return '';
// //
// //         return [g1,':',g2,';'].join('');
// //
// //     }).replace(/;*?"?$/,''),'"'].join('');
// //
// // }));

// var source = 'fdjakfjdasklhfdaso   tooltip: "解锁材料提示" fsdjklafjdasklfjdsla34871200  tooltip: "解锁材料提示"'

// Editor.log(source.replace(/(?:;|")\s*(.*?):(.*?)(?=;|")/g, function (m, g1, g2) {

// 	// 删除b属性和c属性 要改成其他属性可以在这里控制
// 	if (/^(tooltip|tooltip)$/.test(g1))
// 		return '';

// 	return [g1, ':', g2, ';'].join('');

// }).replace(/;*?"?$/, ''));
