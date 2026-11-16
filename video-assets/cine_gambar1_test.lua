local PAL={{0,0,0,0},{0,0,0,255},{160,160,160,255},{192,192,192,255},{32,32,32,255},{224,224,224,255},{64,64,64,255},{96,96,96,255},{128,128,128,255},{224,96,128,255},{32,0,0,255},{96,0,0,255},{128,0,0,255},{160,0,0,255},{64,0,0,255},{64,32,32,255},{192,96,96,255},{224,128,160,255},{160,64,96,255},{128,64,64,255},{224,128,128,255},{96,160,224,255},{96,192,224,255},{128,192,224,255}}
local FACES={
["girl_neutral"]="0:4000,0:2198,1:3,0:27,1:3,0:94,1:3,0:27,1:3,0:93,1:4,0:26,1:4,0:90,1:6,0:24,1:6,0:91,1:6,0:24,1:6,0:91,1:2,2:1,3:1,1:3,0:23,1:2,2:1,3:1,1:3,0:91,1:1,4:1,5:2,6:1,1:3,0:22,1:1,4:1,5:2,6:1,1:3,0:90,1:2,7:1,8:1,1:4,0:22,1:2,7:1,8:1,1:4,0:90,1:8,0:22,1:8,0:90,1:8,0:22,1:8,0:90,1:8,0:22,1:8,0:90,1:8,0:22,1:8,0:90,1:8,0:22,1:8,0:90,1:7,0:23,1:7,0:92,1:6,0:24,1:6,0:93,1:4,0:26,1:4,0:1480,9:11,0:57,9:11,0:45,9:18,0:50,9:18,0:40,9:22,0:46,9:22,0:37,9:24,0:44,9:24,0:36,9:25,0:43,9:25,0:35,9:24,0:44,9:24,0:37,9:22,0:46,9:22,0:40,9:18,0:18,1:2,0:10,1:2,0:18,9:18,0:46,9:11,0:21,1:3,0:7,1:4,0:22,9:11,0:82,1:12,0:117,1:9,0:122,1:4,0:4000,0:1310",
["girl_shock"]="0:4000,0:653,1:2,0:33,1:2,0:91,1:2,0:33,1:2,0:84,1:1,0:6,1:2,0:26,1:1,0:6,1:2,0:83,1:3,0:5,1:2,0:25,1:3,0:5,1:2,0:83,1:3,0:5,1:2,0:25,1:3,0:5,1:2,0:84,1:3,0:4,1:3,0:25,1:3,0:4,1:3,0:84,1:2,0:1,1:9,0:23,1:2,0:1,1:9,0:81,1:5,4:1,6:3,1:4,0:22,1:5,4:1,6:3,1:4,0:80,1:3,6:1,2:1,5:5,2:1,4:1,1:3,0:20,1:3,6:1,2:1,5:5,2:1,4:1,1:3,0:70,1:3,0:4,1:3,2:1,5:9,8:1,1:3,0:11,1:3,0:4,1:3,2:1,5:9,8:1,1:3,0:69,1:4,0:2,1:3,3:1,5:11,2:1,1:2,0:11,1:4,0:2,1:3,3:1,5:11,2:1,1:2,0:71,1:6,3:1,5:13,8:1,1:2,0:12,1:6,3:1,5:13,8:1,1:2,0:71,1:4,8:1,5:15,6:1,1:2,0:12,1:4,8:1,5:15,6:1,1:2,0:72,1:1,4:1,5:16,3:1,1:2,0:14,1:1,4:1,5:16,3:1,1:2,0:71,1:2,8:1,5:17,6:1,1:1,0:13,1:2,8:1,5:17,6:1,1:1,0:71,1:2,3:1,5:17,8:1,1:2,0:12,1:2,3:1,5:17,8:1,1:2,0:70,1:1,4:1,5:8,7:1,4:1,8:1,5:7,3:1,1:2,0:12,1:1,4:1,5:8,7:1,4:1,8:1,5:7,3:1,1:2,0:70,1:1,6:1,5:7,6:1,2:1,7:1,1:1,7:1,5:7,1:2,0:12,1:1,6:1,5:7,6:1,2:1,7:1,1:1,7:1,5:7,1:2,0:70,1:1,6:1,5:6,8:1,4:1,5:1,3:1,1:2,3:1,5:6,4:1,1:1,0:12,1:1,6:1,5:6,8:1,4:1,5:1,3:1,1:2,3:1,5:6,4:1,1:1,0:70,1:1,6:1,5:6,8:1,1:1,6:1,4:1,1:2,3:1,5:6,4:1,1:1,0:12,1:1,6:1,5:6,8:1,1:1,6:1,4:1,1:2,3:1,5:6,4:1,1:1,0:70,1:1,6:1,5:6,3:1,1:4,6:1,5:7,1:2,0:12,1:1,6:1,5:6,3:1,1:4,6:1,5:7,1:2,0:70,1:1,4:1,5:7,3:1,4:1,1:1,6:1,5:7,3:1,1:2,0:12,1:1,4:1,5:7,3:1,4:1,1:1,6:1,5:7,3:1,1:2,0:70,1:2,3:1,5:17,8:1,1:2,0:12,1:2,3:1,5:17,8:1,1:2,0:70,1:2,8:1,5:17,6:1,1:1,0:13,1:2,8:1,5:17,6:1,1:1,0:72,1:1,4:1,5:16,3:1,1:2,0:14,1:1,4:1,5:16,3:1,1:2,0:72,1:2,8:1,5:15,6:1,1:2,0:14,1:2,8:1,5:15,6:1,1:2,0:73,1:2,3:1,5:13,8:1,1:2,0:16,1:2,3:1,5:13,8:1,1:2,0:74,1:3,3:1,5:11,2:1,1:2,0:17,1:3,3:1,5:11,2:1,1:2,0:76,1:3,2:1,5:9,8:1,1:3,0:18,1:3,2:1,5:9,8:1,1:3,0:77,1:3,6:1,2:1,5:5,2:1,4:1,1:3,0:20,1:3,6:1,2:1,5:5,2:1,4:1,1:3,0:79,1:4,4:1,6:3,1:4,0:23,1:4,4:1,6:3,1:4,0:83,1:9,0:26,1:9,0:1897,1:2,0:124,1:6,0:121,1:2,10:1,11:2,10:1,1:2,0:120,1:1,10:1,12:2,13:1,12:1,10:1,1:1,0:119,1:2,12:4,13:1,11:1,1:2,0:118,1:1,10:1,12:6,1:2,0:118,1:1,14:1,12:6,10:1,1:1,0:118,1:1,14:1,13:1,12:5,10:1,1:1,0:118,1:1,14:1,12:6,10:1,1:1,0:118,1:1,10:1,12:6,1:2,0:118,1:2,12:4,13:1,11:1,1:2,0:119,1:1,10:1,12:2,13:1,12:1,10:1,1:1,0:120,1:2,10:1,11:2,10:1,1:2,0:121,1:6,0:124,1:2,0:4000,0:31",
["guy_dead"]="0:4000,0:2054,1:3,0:11,1:3,0:18,1:3,0:11,1:3,0:75,1:5,0:9,1:4,0:17,1:5,0:9,1:4,0:76,1:5,0:7,1:5,0:18,1:5,0:7,1:5,0:77,1:5,0:5,1:5,0:20,1:5,0:5,1:5,0:79,1:5,0:3,1:5,0:22,1:5,0:3,1:5,0:81,1:5,0:1,1:5,0:24,1:5,0:1,1:5,0:83,1:9,0:26,1:9,0:85,1:7,0:28,1:7,0:87,1:5,0:30,1:5,0:87,1:7,0:28,1:7,0:85,1:9,0:26,1:9,0:83,1:5,0:1,1:5,0:24,1:5,0:1,1:5,0:81,1:5,0:3,1:5,0:22,1:5,0:3,1:5,0:79,1:5,0:5,1:5,0:20,1:5,0:5,1:5,0:77,1:5,0:7,1:5,0:18,1:5,0:7,1:5,0:75,1:5,0:9,1:4,0:17,1:5,0:9,1:4,0:76,1:3,0:11,1:3,0:18,1:3,0:11,1:3,0:77,1:1,0:13,1:1,0:20,1:1,0:13,1:1,0:2781,1:20,0:108,1:16,10:1,15:1,1:2,0:108,1:16,16:1,17:1,18:1,1:1,0:122,1:1,19:1,17:1,9:1,20:1,15:1,1:1,0:121,1:1,16:1,20:1,9:1,20:1,19:1,1:1,0:120,1:1,10:1,9:1,20:3,16:1,1:1,0:120,1:1,10:1,9:1,20:3,16:1,1:1,0:120,1:1,10:1,9:1,20:3,16:1,1:1,0:121,1:1,16:1,20:1,9:1,20:1,19:1,1:1,0:121,1:1,19:1,17:1,9:1,17:1,15:1,1:1,0:121,1:1,4:1,9:1,17:1,16:1,1:2,0:122,1:1,15:1,19:1,10:1,1:1,0:124,1:3,0:3767",
["guy_nervous"]="0:4000,0:405,1:2,0:18,1:1,0:103,1:6,0:17,1:7,0:28,21:1,0:64,1:12,0:16,1:12,0:23,22:1,0:59,1:13,0:24,1:12,0:18,21:1,23:1,21:1,0:54,1:12,0:33,1:13,0:13,21:1,22:2,0:54,1:8,0:42,1:8,0:13,22:1,21:1,23:1,21:1,0:53,1:3,0:52,1:3,0:12,21:1,23:1,21:1,22:1,21:1,0:123,22:2,21:2,22:1,0:122,21:1,23:1,21:3,22:1,21:1,0:121,21:1,22:1,21:4,22:1,0:120,21:1,22:1,21:5,22:1,21:1,0:57,1:8,0:30,1:8,0:16,22:2,21:6,22:1,0:56,1:3,4:1,6:2,4:1,1:4,0:26,1:4,6:3,4:1,1:3,0:14,21:1,23:1,21:7,22:1,21:1,0:53,1:3,6:1,2:1,5:4,3:1,7:1,1:3,0:24,1:3,8:1,5:5,2:1,4:1,1:2,0:13,21:1,23:1,21:7,22:1,21:1,0:53,1:2,8:1,5:8,2:1,1:3,0:22,1:2,6:1,3:1,5:8,7:1,1:2,0:12,21:1,23:1,21:7,22:1,21:1,0:52,1:2,2:1,5:10,3:1,1:2,0:21,1:2,4:1,5:11,7:1,1:2,0:12,22:1,21:7,23:1,21:1,0:51,1:2,7:1,5:12,8:1,1:2,0:20,1:2,3:1,5:12,4:1,1:2,0:11,21:1,23:1,21:5,23:1,21:1,0:52,1:2,3:1,5:13,4:1,1:1,0:19,1:2,7:1,5:13,2:1,1:2,0:12,21:1,23:1,22:3,23:1,22:1,0:52,1:2,6:1,5:14,8:1,1:2,0:18,1:2,3:1,5:14,4:1,1:1,0:14,22:4,0:53,1:2,2:1,3:1,6:1,1:1,4:1,2:1,5:9,3:1,1:2,0:18,1:1,4:1,5:1,7:1,4:1,1:1,6:1,5:10,7:1,1:2,0:70,1:2,8:1,7:1,3:1,7:1,1:2,2:1,5:9,4:1,1:1,0:17,1:2,7:1,8:1,2:1,3:1,1:2,6:1,5:9,8:1,1:2,0:70,1:1,4:1,6:2,5:1,7:1,1:2,4:1,5:9,6:1,1:1,0:17,1:2,7:1,4:1,3:2,1:3,2:1,5:8,3:1,1:2,0:70,1:1,4:2,1:1,4:1,1:3,4:1,5:9,6:1,1:1,0:17,1:2,6:1,1:6,8:1,5:8,3:1,1:2,0:70,1:1,4:1,7:1,1:5,6:1,5:9,6:1,1:1,0:17,1:2,7:1,4:1,1:5,2:1,5:8,3:1,1:2,0:70,1:2,2:1,6:1,1:4,3:1,5:9,4:1,1:1,0:18,1:1,7:1,2:1,1:4,7:1,5:9,8:1,1:2,0:70,1:2,2:1,5:1,7:1,6:1,7:1,3:1,5:9,3:1,1:2,0:18,1:1,4:1,5:1,2:1,6:2,8:1,5:10,6:1,1:2,0:71,1:1,6:1,5:14,8:1,1:2,0:18,1:2,2:1,5:14,1:2,0:72,1:2,3:1,5:13,4:1,1:1,0:19,1:2,6:1,5:13,8:1,1:2,0:72,1:2,6:1,5:12,7:1,1:2,0:20,1:2,2:1,5:12,1:2,0:74,1:2,7:1,5:10,2:1,1:2,0:22,1:2,3:1,5:10,6:1,1:2,0:75,1:2,7:1,5:8,8:1,1:3,0:22,1:3,2:1,5:7,3:1,4:1,1:2,0:77,1:2,4:1,8:1,3:1,5:2,3:1,2:1,4:1,1:3,0:24,1:3,6:1,2:1,5:3,3:1,7:1,1:3,0:79,1:4,4:2,1:4,0:28,1:4,4:2,1:4,0:82,1:6,0:31,1:7,0:963,9:11,0:57,9:11,0:45,9:18,0:50,9:18,0:40,9:22,0:46,9:22,0:37,9:24,0:44,9:24,0:36,9:25,0:43,9:25,0:35,9:24,0:44,9:24,0:37,9:22,0:46,9:22,0:40,9:18,0:50,9:18,0:46,9:11,0:57,9:11,0:594,1:4,0:9,1:3,0:109,1:9,0:5,1:7,0:106,1:5,0:1,1:6,0:1,1:10,0:105,1:3,0:5,1:9,0:3,1:2,0:116,1:5,0:4000,0:539",
["guy_scared"]="0:4000,0:20,1:3,0:17,1:4,0:101,1:7,0:16,1:7,0:95,1:9,0:18,1:9,0:89,1:9,0:24,1:9,0:82,1:9,0:31,1:9,0:19,21:1,0:56,1:9,0:38,1:9,0:15,22:1,0:55,1:7,0:44,1:7,0:13,21:1,23:1,21:1,0:54,1:4,0:50,1:4,0:13,21:1,22:2,0:125,22:1,21:1,23:1,21:1,0:123,21:1,23:1,21:1,22:1,21:1,0:123,22:2,21:2,22:1,0:59,1:8,0:29,1:9,0:17,21:1,23:1,21:3,22:1,21:1,0:56,1:4,4:1,6:2,4:1,1:4,0:26,1:4,6:3,4:1,1:4,0:15,21:1,22:1,21:4,22:1,0:55,1:3,7:1,3:1,5:4,3:1,8:1,4:1,1:2,0:23,1:3,4:1,2:1,5:5,2:1,6:1,1:3,0:13,21:1,22:1,21:5,22:1,21:1,0:53,1:2,6:1,3:1,5:9,7:1,1:2,0:21,1:3,8:1,5:9,2:1,1:3,0:12,22:2,21:6,22:1,0:52,1:2,6:1,5:12,7:1,1:2,0:20,1:2,2:1,5:11,3:1,1:3,0:10,21:1,23:1,21:7,22:1,21:1,0:50,1:2,4:1,5:14,7:1,1:2,0:18,1:2,8:1,5:13,3:1,1:2,0:10,21:1,23:1,21:7,22:1,21:1,0:50,1:2,3:1,5:15,4:1,1:1,0:17,1:2,6:1,5:15,8:1,1:2,0:9,21:1,23:1,21:7,22:1,21:1,0:49,1:2,6:1,5:7,2:1,6:1,1:1,4:1,8:1,5:4,8:1,1:2,0:16,1:2,3:1,5:7,8:1,4:2,6:1,3:1,5:4,4:1,1:1,0:10,22:1,21:7,23:1,21:1,0:49,1:2,2:1,5:6,2:1,8:1,3:1,4:1,1:2,8:1,5:4,1:2,0:16,1:1,6:1,5:7,7:1,3:1,8:1,1:2,4:1,5:4,8:1,1:2,0:9,21:1,23:1,21:5,23:1,21:1,0:50,1:1,4:1,5:7,4:1,8:1,5:1,4:1,1:3,5:4,6:1,1:1,0:15,1:2,8:1,5:6,2:1,4:1,5:1,8:1,1:3,7:1,5:3,3:1,1:2,0:10,21:1,23:1,22:3,23:1,22:1,0:51,1:1,6:1,5:7,1:7,2:1,5:3,8:1,1:2,0:14,1:2,3:1,5:6,8:1,1:1,4:1,1:4,6:1,5:4,4:1,1:1,0:12,22:4,0:51,1:2,7:1,5:7,4:1,1:6,3:1,5:3,2:1,1:2,0:14,1:2,5:7,2:1,1:6,7:1,5:4,6:1,1:1,0:67,1:2,8:1,5:7,8:1,1:5,7:1,5:4,3:1,1:2,0:14,1:1,4:1,5:8,4:1,1:5,3:1,5:4,6:1,1:1,0:67,1:2,8:1,5:8,8:1,1:3,7:1,5:5,3:1,1:2,0:14,1:1,4:1,5:8,3:1,6:1,1:2,4:1,2:1,5:5,6:1,1:1,0:67,1:2,7:1,5:10,2:1,3:1,5:6,2:1,1:2,0:14,1:2,5:10,3:2,5:7,6:1,1:1,0:68,1:1,6:1,5:18,8:1,1:2,0:14,1:2,3:1,5:18,4:1,1:1,0:68,1:1,4:1,5:18,6:1,1:1,0:15,1:2,8:1,5:17,3:1,1:2,0:68,1:2,2:1,5:17,1:2,0:16,1:1,6:1,5:17,8:1,1:2,0:68,1:2,6:1,5:16,8:1,1:2,0:16,1:2,3:1,5:16,4:1,1:1,0:70,1:2,3:1,5:15,4:1,1:1,0:17,1:2,6:1,5:15,8:1,1:2,0:70,1:2,4:1,5:14,7:1,1:2,0:18,1:2,8:1,5:13,3:1,1:2,0:72,1:2,6:1,5:12,7:1,1:2,0:20,1:2,2:1,5:11,3:1,1:3,0:73,1:2,6:1,3:1,5:9,7:1,1:2,0:21,1:3,8:1,5:9,2:1,1:3,0:75,1:3,7:1,3:1,5:4,3:1,8:1,4:1,1:2,0:23,1:3,4:1,2:1,5:5,2:1,6:1,1:3,0:77,1:4,4:1,6:2,4:1,1:4,0:26,1:4,6:3,4:1,1:4,0:80,1:8,0:29,1:9,0:2530,1:1,0:6,1:1,0:6,1:1,0:106,1:2,0:4,1:3,0:4,1:3,0:4,1:3,0:4,1:1,0:99,1:4,0:2,1:5,0:2,1:5,0:2,1:5,0:2,1:3,0:99,1:28,0:101,1:5,0:2,1:5,0:2,1:5,0:2,1:5,0:103,1:3,0:4,1:3,0:4,1:3,0:4,1:3,0:105,1:1,0:6,1:1,0:6,1:1,0:6,1:1,0:4000,0:405",
["guy_shock"]="0:3508,1:3,0:18,1:3,0:101,1:7,0:16,1:7,0:95,1:8,0:20,1:8,0:89,1:8,0:25,1:8,0:85,1:8,0:30,1:8,0:79,1:8,0:36,1:8,0:73,1:8,0:42,1:8,0:70,1:5,0:47,1:6,0:70,1:3,0:52,1:3,0:460,1:9,0:28,1:9,0:80,1:4,4:1,6:3,1:4,0:25,1:4,4:1,6:3,4:1,1:4,0:76,1:3,4:1,8:1,3:1,5:5,2:1,6:1,1:3,0:22,1:3,7:1,2:1,5:5,3:1,7:1,4:1,1:2,0:74,1:3,8:1,5:10,2:1,1:3,0:20,1:2,4:1,3:1,5:10,7:1,1:2,0:72,1:3,2:1,5:12,3:1,4:1,1:2,0:18,1:2,6:1,5:13,8:1,1:2,0:71,1:2,2:1,5:15,1:3,0:16,1:2,6:1,5:15,7:1,1:2,0:69,1:2,8:1,5:16,3:1,1:2,0:16,1:1,4:1,5:17,6:1,1:2,0:67,1:2,4:1,5:18,7:1,1:2,0:14,1:2,2:1,5:17,3:1,1:2,0:67,1:2,2:1,5:18,3:1,1:2,0:14,1:1,4:1,5:19,7:1,1:2,0:66,1:1,4:1,5:20,6:1,1:2,0:12,1:2,8:1,5:19,3:1,1:2,0:65,1:2,7:1,5:20,2:1,1:2,0:12,1:2,3:1,5:20,4:1,1:1,0:65,1:2,2:1,5:20,3:1,1:2,0:12,1:1,4:1,5:21,7:1,1:2,0:64,1:2,3:1,5:8,3:1,6:2,2:1,5:9,4:1,1:1,0:12,1:1,7:1,5:9,8:1,4:1,7:1,5:9,8:1,1:2,0:64,1:1,4:1,5:8,3:1,4:1,2:1,7:1,1:1,2:1,5:8,6:1,1:1,0:11,1:2,8:1,5:8,7:1,6:1,2:1,1:1,6:1,5:8,3:1,1:2,0:64,1:1,4:1,5:8,7:1,4:1,5:1,3:1,1:1,6:1,5:8,6:1,1:1,0:11,1:2,8:1,5:8,1:1,2:1,5:1,6:1,1:1,3:1,5:7,3:1,1:2,0:64,1:1,4:1,5:8,8:1,1:1,6:1,4:1,1:1,6:1,5:8,6:1,1:1,0:11,1:2,8:1,5:8,4:1,1:1,6:1,1:2,3:1,5:7,3:1,1:2,0:64,1:2,5:9,6:1,1:3,3:1,5:8,6:1,1:1,0:11,1:2,7:1,5:8,2:1,1:3,7:1,5:8,2:1,1:2,0:64,1:2,3:1,5:9,8:2,3:1,5:9,4:1,1:1,0:12,1:1,6:1,5:9,3:1,8:1,2:1,5:9,8:1,1:2,0:64,1:2,8:1,5:20,3:1,1:2,0:12,1:1,4:1,5:21,6:1,1:1,0:66,1:1,6:1,5:20,8:1,1:2,0:12,1:2,2:1,5:20,4:1,1:1,0:66,1:2,3:1,5:19,4:1,1:1,0:13,1:2,7:1,5:19,2:1,1:2,0:66,1:2,7:1,5:18,2:1,1:2,0:14,1:2,3:1,5:18,4:1,1:2,0:67,1:2,3:1,5:17,4:1,1:2,0:14,1:2,7:1,5:17,8:1,1:2,0:68,1:2,4:1,5:16,7:1,1:2,0:16,1:2,2:1,5:15,3:1,1:2,0:70,1:2,6:1,5:14,8:1,1:2,0:18,1:2,3:1,5:14,4:1,1:2,0:71,1:2,6:1,5:12,7:1,1:2,0:19,1:3,8:1,5:11,3:1,4:1,1:2,0:73,1:2,4:1,2:1,5:8,2:1,6:1,1:2,0:21,1:3,7:1,3:1,5:8,8:1,1:3,0:75,1:3,4:1,7:1,2:1,3:2,2:1,7:1,4:1,1:3,0:24,1:3,6:1,8:1,3:3,8:1,6:1,1:4,0:78,1:11,0:26,1:11,0:82,1:6,0:32,1:6,0:1511,1:6,0:121,1:8,0:119,1:2,10:1,11:1,12:2,11:1,10:1,1:2,0:117,1:2,14:1,12:4,13:1,12:1,10:1,1:2,0:115,1:2,10:1,12:8,1:2,0:115,1:2,11:1,12:7,13:1,14:1,1:2,0:114,1:1,10:1,12:10,1:2,0:113,1:2,14:1,13:1,12:9,10:1,1:1,0:113,1:2,11:1,12:10,14:1,1:2,0:112,1:2,11:1,12:9,13:1,14:1,1:2,0:112,1:2,11:1,12:9,13:1,14:1,1:2,0:112,1:2,11:1,12:10,14:1,1:2,0:112,1:2,14:1,13:1,12:9,10:1,1:1,0:114,1:1,10:1,12:10,1:2,0:114,1:2,12:8,13:1,11:1,1:2,0:114,1:2,14:1,13:1,12:7,10:1,1:2,0:115,1:2,11:1,13:1,12:5,14:1,1:2,0:117,1:2,14:1,12:4,10:1,1:2,0:118,1:4,10:2,1:3,0:121,1:6,0:3645",
["guy_shy"]="0:4000,0:2573,1:3,0:32,1:3,0:87,1:9,0:26,1:9,0:82,1:13,0:22,1:13,0:79,1:5,0:5,1:5,0:20,1:5,0:5,1:5,0:77,1:4,0:9,1:3,0:19,1:4,0:9,1:3,0:78,1:2,0:11,1:2,0:20,1:2,0:11,1:2,0:2368,9:11,0:57,9:11,0:45,9:18,0:50,9:18,0:40,9:22,0:46,9:22,0:37,9:24,0:44,9:24,0:36,9:25,0:43,9:25,0:35,9:24,0:44,9:24,0:37,9:22,0:46,9:22,0:40,9:18,0:50,9:18,0:46,9:11,0:57,9:11,0:79,1:2,0:14,1:1,0:110,1:4,0:12,1:3,0:110,1:4,0:10,1:4,0:111,1:6,0:3,1:7,0:113,1:13,0:117,1:10,0:4000,0:923",
}
-- Ansaro cinematic v2: blocky part-rigs, full control
local Players=game:GetService("Players")
local RS=game:GetService("RunService")
local AS=game:GetService("AssetService")
local SG=game:GetService("StarterGui")
pcall(function() SG:SetCoreGuiEnabled(Enum.CoreGuiType.All,false) end)
pcall(function() SG:SetCore("TopbarEnabled",false) end)
local cam=workspace.CurrentCamera
local sc=game.ReplicatedStorage:WaitForChild("Scene") task.wait(1)
local bouquet=sc.Bouquet:Clone() bouquet.Parent=workspace
-- faces
local N=128 local IMG={}
for name,data in FACES do
  local buf=buffer.create(N*N*4) local o=0
  for item in string.gmatch(data,"[^,]+") do
    local ci,cnt=string.match(item,"(%d+):(%d+)") local c=PAL[tonumber(ci)+1]
    for _=1,tonumber(cnt) do buffer.writeu8(buf,o,c[1]) buffer.writeu8(buf,o+1,c[2]) buffer.writeu8(buf,o+2,c[3]) buffer.writeu8(buf,o+3,c[4]) o+=4 end
  end
  local ok,img=pcall(function() return AS:CreateEditableImage({Size=Vector2.new(N,N)}) end)
  if ok and img then img:WritePixelsBuffer(Vector2.zero,Vector2.new(N,N),buf) IMG[name]=Content.fromObject(img) else warn("EditableImage fail",img) end
end
-- rigs
local SKIN=Color3.fromRGB(234,184,146)
local folder=Instance.new("Folder") folder.Name="LocalCast" folder.Parent=workspace
local function P(name,size,col,parent) local p=Instance.new("Part") p.Name=name p.Size=size p.Color=col p.Anchored=true p.CanCollide=false p.CastShadow=true p.TopSurface=0 p.BottomSurface=0 p.Material=Enum.Material.SmoothPlastic p.Parent=parent return p end
local function rig(name,torsoCol,legCol)
  local m=Instance.new("Model") m.Name=name m.Parent=folder
  local r={model=m}
  r.T=P("Torso",Vector3.new(2,2,1),torsoCol,m)
  r.H=P("Head",Vector3.new(2,1,1),SKIN,m) local mesh=Instance.new("SpecialMesh") mesh.MeshType=Enum.MeshType.Head mesh.Scale=Vector3.new(1.25,1.25,1.25) mesh.Parent=r.H
  r.face=Instance.new("Decal") r.face.Face=Enum.NormalId.Front r.face.Parent=r.H
  r.LA=P("LArm",Vector3.new(1,2,1),SKIN,m) r.RA=P("RArm",Vector3.new(1,2,1),SKIN,m)
  r.LL=P("LLeg",Vector3.new(1,2,1),legCol,m) r.RL=P("RLeg",Vector3.new(1,2,1),legCol,m)
  r.extra={}
  return r
end
local function A(x,y,z) return CFrame.Angles(math.rad(x or 0),math.rad(y or 0),math.rad(z or 0)) end
-- pose: root = torso CFrame; q = {la={x,y,z},ra=..,ll=..,rl=..,neck=..}
local function pose(r,root,q)
  q=q or {}
  local function g(k) local v=q[k] or {0,0,0} return A(v[1],v[2],v[3]) end
  r.T.CFrame=root
  r.H.CFrame=root*CFrame.new(0,1,0)*g("neck")*CFrame.new(0,0.5,0)
  r.LA.CFrame=root*CFrame.new(-1.5,0.5,0)*g("la")*CFrame.new(0,-0.5,0)
  r.RA.CFrame=root*CFrame.new(1.5,0.5,0)*g("ra")*CFrame.new(0,-0.5,0)
  r.LL.CFrame=root*CFrame.new(-0.5,-1,0)*g("ll")*CFrame.new(0,-1,0)
  r.RL.CFrame=root*CFrame.new(0.5,-1,0)*g("rl")*CFrame.new(0,-1,0)
  for _,e in r.extra do e.p.CFrame=r.H.CFrame*e.rel end
end
local guy=rig("Guy",Color3.fromRGB(40,170,75),Color3.fromRGB(40,40,48))
local girl=rig("Girl",Color3.fromRGB(235,125,165),Color3.fromRGB(70,100,165))
-- girl hair from the R15 template
do
  local tg=sc.Cast.Girl local th=tg.Head
  local acc=tg.Humanoid:GetAccessories()[1]
  local BROWN=Color3.fromRGB(95,58,35)
  if acc then local h=acc.Handle:Clone() h.Anchored=true h.CanCollide=false for _,c in h:GetChildren() do if not c:IsA("SpecialMesh") then c:Destroy() end end h.Parent=girl.model
    local rel=th.CFrame:Inverse()*acc.Handle.CFrame
    table.insert(girl.extra,{p=h,rel=CFrame.new(rel.Position*1.05+Vector3.new(0,0.02,0))*(rel-rel.Position)}) end
  local back=P("BackHair",Vector3.new(1.3,1.9,0.35),BROWN,girl.model)
  table.insert(girl.extra,{p=back,rel=CFrame.new(0,-0.45,0.55)})
end
local curF={}
local function face(r,name) if curF[r]==name then return end curF[r]=name if IMG[name] then r.face.TextureContent=IMG[name] end end
-- open coffin built from parts (lid = mesh coffin leaning)
local CX,CZ=-36,3
do
  local cf=Instance.new("Model") cf.Name="OpenCoffin" cf.Parent=workspace
  local WOOD=Color3.fromRGB(70,40,25) local SAT=Color3.fromRGB(245,240,235)
  P("Bottom",Vector3.new(7,0.4,2.8),WOOD,cf).CFrame=CFrame.new(CX,0.3,CZ)
  P("Satin",Vector3.new(6.6,0.2,2.4),SAT,cf).CFrame=CFrame.new(CX,0.6,CZ)
  P("SideA",Vector3.new(7,1.6,0.25),WOOD,cf).CFrame=CFrame.new(CX,1.2,CZ-1.4)
  P("SideB",Vector3.new(7,1.6,0.25),WOOD,cf).CFrame=CFrame.new(CX,1.2,CZ+1.4)
  P("EndA",Vector3.new(0.25,1.6,2.8),WOOD,cf).CFrame=CFrame.new(CX-3.5,1.2,CZ)
  P("EndB",Vector3.new(0.25,1.6,2.8),WOOD,cf).CFrame=CFrame.new(CX+3.5,1.2,CZ)
  P("Pillow",Vector3.new(1,0.4,1.8),SAT,cf).CFrame=CFrame.new(CX-2.7,0.85,CZ)
  for i=-1,1 do local fl=sc.Bouquet:Clone() fl.Parent=cf fl:PivotTo(CFrame.new(CX+i*2.4,0.8,CZ-2.3)*A(0,i*40,20)) end
  local lid=sc.Coffin:Clone() lid.Parent=cf lid:PivotTo(CFrame.new(CX,4.5,-4.2)*A(0,90,0)*A(70,0,0))
end
-- end walls
for _,x in {-45,45} do P("EndWall",Vector3.new(1,18,20),Color3.fromRGB(235,230,215),workspace).CFrame=CFrame.new(x,9,3) end
-- subtitles
local pg=Players.LocalPlayer:WaitForChild("PlayerGui")
local gui=Instance.new("ScreenGui") gui.Name="Subs" gui.IgnoreGuiInset=true gui.ResetOnSpawn=false gui.DisplayOrder=10 gui.Parent=pg
for _,ax in {0,1} do local sb=Instance.new("Frame") sb.Name="SideBar" sb.BackgroundColor3=Color3.new(0,0,0) sb.BorderSizePixel=0 sb.AnchorPoint=Vector2.new(ax,0) sb.Position=UDim2.fromScale(ax,0) sb.Parent=gui local function fit() local v=workspace.CurrentCamera.ViewportSize sb.Size=UDim2.fromOffset(math.max(0,(v.X-v.Y*9/16)/2),v.Y) end fit() workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(fit) end
local black=Instance.new("Frame") black.Size=UDim2.fromScale(1,1) black.BackgroundColor3=Color3.new(0,0,0) black.BorderSizePixel=0 black.Parent=gui
local lbl=Instance.new("TextLabel") lbl.BackgroundTransparency=1 lbl.AnchorPoint=Vector2.new(0.5,0.5) lbl.Position=UDim2.fromScale(0.5,0.68) lbl.Size=UDim2.fromScale(0.4,0.11)
lbl.Font=Enum.Font.GothamBlack lbl.TextScaled=true lbl.TextColor3=Color3.new(1,1,1) lbl.Text="" lbl.Parent=gui
local st=Instance.new("UIStroke") st.Thickness=5 st.Color=Color3.new(0,0,0) st.Parent=lbl
local tsc=Instance.new("UITextSizeConstraint") tsc.MaxTextSize=64 tsc.Parent=lbl
local WORDS={{0.15,"I'M"},{0.45,"THE"},{0.7,"SHYEST"},{1.6,"PERSON"},{2.15,"EVER"},{3.0,"WHEN"},{3.25,"I"},{3.45,"SEE"},{3.75,"MY"},{3.95,"CRUSH"},{4.55,"I"},{4.7,"TRIED"},{5.0,"TO"},{5.2,"GIVE"},{5.45,"HER"},{5.7,"FLOWERS"},{6.5,"AND"},{6.75,"TRIPPED"},{8.05,"OH"},{8.35,"MY..."},{9.15,"R.I.P."},{9.7,"🥀"}}
local function word(t) local w="" for _,x in WORDS do if t>=x[1] then w=x[2] end end return w end
local function lerp(a,b,t) return a+(b-a)*math.clamp(t,0,1) end
local function ease(t) t=math.clamp(t,0,1) return t*t*(3-2*t) end
local function shake(amp,t) return CFrame.Angles(math.rad(amp*math.noise(t*9,1)),math.rad(amp*math.noise(t*9,2)),0) end
local function look(pos,target,roll) return CFrame.lookAt(pos,target)*CFrame.Angles(0,0,math.rad(roll or 0)) end
local FLOOR=0.1
local function standCF(x,z,dir) local p=Vector3.new(x,FLOOR+3,z) return CFrame.lookAt(p,p+dir) end
local PX=Vector3.new(1,0,0) local NX=Vector3.new(-1,0,0)
local HOLD={la={80,0,-25},ra={80,0,25}}
local function bouquetFront(r) bouquet:PivotTo(r.T.CFrame*CFrame.new(0,-0.1,-1.9)*A(-70,0,0)) end
local LOOP=12.6
local t0=os.clock()+2
RS:BindToRenderStep("Cine",Enum.RenderPriority.Camera.Value+1,function()
  cam.CameraType=Enum.CameraType.Scriptable
  local T=os.clock()-t0
  if T<0 then black.Visible=true lbl.Text="" return end
  T=T%LOOP
  if T>10.6 then black.Visible=true lbl.Text="" return end
  black.Visible=false lbl.Text=word(T)
  cam.FieldOfView=60
  local idle=math.sin(T*2)*2
  pose(girl,standCF(4,1,NX),{la={0,0,-4+idle},ra={0,0,4-idle}}) face(girl,"girl_neutral")
  if T<1.5 then
    pose(guy,standCF(-4,1,PX),HOLD) bouquetFront(guy) face(guy,"guy_scared")
    local hp=guy.H.Position
    cam.FieldOfView=50
    cam.CFrame=look(hp+Vector3.new(3.6-T*0.5,0.4,1.2),hp+Vector3.new(0,-0.15,0),-24+T*6)*shake(4*(1.5-T),T)
  elseif T<3.0 then
    local u=(T-1.5)/1.5
    pose(guy,standCF(-4,1,PX),{la=HOLD.la,ra=HOLD.ra,neck={-12,0,10}}) bouquetFront(guy) face(guy,"guy_shy")
    local hp=guy.H.Position
    cam.CFrame=look(hp+Vector3.new(lerp(8,5.5,ease(u)),-0.4,lerp(2.2,1,u)),hp+Vector3.new(0,-1.4,0),4)
  elseif T<4.5 then
    local u=(T-3)/1.5
    pose(guy,standCF(-4,1,PX),HOLD) bouquetFront(guy) face(guy,"guy_shy")
    pose(girl,standCF(4,1,NX),{la={0,0,-4},ra={0,0,25+12*math.sin(T*5)},neck={0,lerp(0,-12,u),0}})
    cam.FieldOfView=lerp(55,40,ease(u))
    cam.CFrame=look(guy.H.Position+Vector3.new(-1.6,0.9,1.8),girl.H.Position+Vector3.new(0,-0.7,0),0)
  elseif T<6.5 then
    local u=(T-4.5)/2
    local x=lerp(-4,0,u)
    local s=math.sin(T*11)*30
    local root=standCF(x,1,PX)+Vector3.new(0,math.abs(math.sin(T*11))*0.12,0)
    pose(guy,root,{la=HOLD.la,ra=HOLD.ra,ll={s,0,0},rl={-s,0,0}}) bouquetFront(guy) face(guy,"guy_nervous")
    cam.CFrame=look(Vector3.new(x-3.5,4.2,8.5),Vector3.new(x+3,2.6,1),0)
  elseif T<8.0 then
    local u=T-6.5
    local fall=ease(u/0.45)
    local feet=CFrame.lookAt(Vector3.new(0,FLOOR,1),Vector3.new(1,FLOOR,1))
    local root=feet*A(-87*fall,0,0)*CFrame.new(0,3,0)+Vector3.new(0,0.5*fall,0)
    pose(guy,root,{la={lerp(80,170,fall),0,-15},ra={lerp(80,170,fall),0,15},rl={-20*fall,0,0},ll={10*fall,0,0},neck={-25*fall,0,0}})
    face(guy,"guy_shock")
    local k=math.clamp(u/0.7,0,1)
    bouquet:PivotTo(CFrame.new(lerp(1.5,6.8,ease(k)),lerp(3,0.7,k)+math.sin(k*math.pi)*2.5,1.4)*A(u*500,u*200,0))
    local imp=(u>0.42 and u<0.9) and (0.9-u)*14 or 0
    cam.FieldOfView=55
    cam.CFrame=look(Vector3.new(1.6,2.4,10.5),Vector3.new(1.8,1.3,1),-8)*shake(imp,T)
  elseif T<9.0 then
    local u=T-8
    local feet=CFrame.lookAt(Vector3.new(0,FLOOR,1),Vector3.new(1,FLOOR,1))
    pose(guy,feet*A(-87,0,0)*CFrame.new(0,3,0)+Vector3.new(0,0.5,0),{la={170,0,-15},ra={170,0,15},neck={-25,0,0}})
    bouquet:PivotTo(CFrame.new(6.8,0.7,1.4)*A(0,40,80))
    pose(girl,standCF(4,1,NX),{la={150,0,-30},ra={150,0,30}}) face(girl,"girl_shock")
    local hp=girl.H.Position
    cam.FieldOfView=lerp(50,32,ease(u/0.25))
    cam.CFrame=look(hp+Vector3.new(-6,0.2,0.8),hp+Vector3.new(0,-0.25,0),0)*shake(1.2,T)
  else
    local u=(T-9)/1.6
    local pos=Vector3.new(CX+0.3,1.25,CZ)
    local root=CFrame.lookAt(pos,pos+Vector3.yAxis,-PX)
    pose(guy,root,{la={110,0,-35},ra={110,0,35}}) face(guy,"guy_dead")
    bouquet:PivotTo(root*CFrame.new(0,0.2,-1.0)*A(-90,0,0))
    cam.FieldOfView=55
    cam.CFrame=look(Vector3.new(CX+0.3,lerp(16,10,ease(u)),CZ+0.01),Vector3.new(CX+0.3,1,CZ),0)
    cam.FieldOfView=lerp(50,45,u)
  end
end)
