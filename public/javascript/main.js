// Initial code by Borui Wang, updated by Graham Roth
// For CS247, Spring 2014

var emojis=[];
var popular=["lol", ":)", ":(", "ugh", ":p", "haha", "rofl", ";)", ":|", "bahaha", "whatever", "yeah!", "phssh", "<3"];
var library ={};
var mediaRecorder;
var recentEmotion=null;
var finished=false;
var video_length=2000;
var pause = video_length+1000;
var time=3;

(function() {

  var cur_video_blob = null;
   //console.log("1");
 // console.log(cur_video_blob);
  var purpose_blob = null;
  var fb_instance;
  var user;

  $(document).ready(function(){
    connect_to_chat_firebase();
    connect_webcam();
  });

  function connect_to_chat_firebase(){
    /* Include your Firebase link here!*/
    fb_instance = new Firebase("https://247-video-library.firebaseIO.com");

    // generate new chatroom id or use existing id
    var url_segments = document.location.href.split("/#");
    if(url_segments[1]){
      fb_chat_room_id = url_segments[1];
    }else{
      fb_chat_room_id = Math.random().toString(36).substring(7);
    }
    display_msg({m:"Share this url with your friend to join this chat: "+ document.location.origin+"/#"+fb_chat_room_id,c:"#151B54"})

    // set up variables to access firebase data structure
    var fb_new_chat_room = fb_instance.child('chatrooms').child(fb_chat_room_id);
    var fb_instance_users = fb_new_chat_room.child('users');
    var fb_instance_stream = fb_new_chat_room.child('stream');
    var my_color = "#057D9F";

    // listen to events
    fb_instance_users.on("child_added",function(snapshot){
      display_msg({m:snapshot.val().name+" joined the room",c: snapshot.val().c});
    });
    fb_instance_stream.on("child_added",function(snapshot){
      display_msg(snapshot.val());
    });

    // block until username is answered
    var username = window.prompt("Welcome, warrior! please declare your name?");
    if(!username){
      username = "anonymous"+Math.floor(Math.random()*1111);
    }
    fb_instance_users.push({ name: username,c: my_color});
    $("#waiting").remove();
   

    // bind submission box
    $("#submission input").keydown(function( event ) {
      if (event.which == 13) {
        if(has_new_emotions($(this).val())){
        	user=$(this).val();
			setTimeout(function(){fb_instance_stream.push({m:username+": " +user, v:cur_video_blob, c: my_color})},pause);
        }else{
           var emotion = has_old_emotions($(this).val());
		   if (emotion!= false){
		   		console.log(emotion);
	         	fb_instance_stream.push({m:username+": " +$(this).val(),v: library[emotion] ,c: my_color});
			}else{
				 fb_instance_stream.push({m:username+": " +$(this).val(), c: my_color});
			}
        }
        $(this).val("");
      }
    });
    
    $("#library input").mousedown(function( event ) {
    	var emoji = window.prompt("what emoji do you want to add a video for?");
    	record(mediaRecorder);
      	setTimeout(function(){saveVideo(emoji)},pause);
      	 emojis.push(emoji);
    });
  }

  // creates a message node and appends it to the conversation
  function display_msg(data){
  	//while(!finished){ }
    $("#conversation").append("<div class='msg' style='color:"+data.c+"'>"+data.m+"</div>");
    if(data.v){
      // for video element
      var video = document.createElement("video");
      video.autoplay = true;
      video.controls = false; // optional
      video.loop = true;
      video.width = 120;
        video.style.borderRadius="50%";
      var source = document.createElement("source");
      source.src =  URL.createObjectURL(base64_to_blob(data.v));
      console.log("convo"+source.src);
      source.type =  "video/webm";

      video.appendChild(source);

      // for gif instead, use this code below and change mediaRecorder.mimeType in onMediaSuccess below
      // var video = document.createElement("img");
      // video.src = URL.createObjectURL(base64_to_blob(data.v));

       // document.getElementById("library").appendChild(video);
     document.getElementById("conversation").appendChild(video);



    }
    // Scroll to the bottom every time we display a new message
    scroll_to_bottom(0);
  }

  function scroll_to_bottom(wait_time){
    // scroll to bottom of div
    setTimeout(function(){
      $("html, body").animate({ scrollTop: $(document).height() }, 200);
    },wait_time);
  }

  function connect_webcam(){
    // we're only recording video, not audio
    var mediaConstraints = {
      video: true,
      audio: false
    };

    // callback for when we get video stream from user.
    var onMediaSuccess = function(stream) {
      // create video element, attach webcam stream to video element
      var video_width= 255;
      var video_height= 200;
      var webcam_stream = document.getElementById('webcam_stream');
      var video = document.createElement('video');
      webcam_stream.innerHTML = "";
      // adds these properties to the video
      video = mergeProps(video, {
          controls: false,
          width: video_width,
          height: video_height,
          src: URL.createObjectURL(stream)
      });
      video.play();
      webcam_stream.appendChild(video);

      // counter
      //var time = 0;
      var second_counter = document.getElementById('second_counter');
      var second_counter_update = setInterval(function(){
        if(time<=3 &&time >0) second_counter.innerHTML = time--;
        else time=3;
      },1000);

      // now record stream in 5 seconds interval
      var video_container = document.getElementById('video_container');
	  mediaRecorder = new MediaStreamRecorder(stream);
      var index = 1;

      mediaRecorder.mimeType = 'video/webm';
      // mediaRecorder.mimeType = 'image/gif';
      // make recorded media smaller to save some traffic (80 * 60 pixels, 3*24 frames)
      mediaRecorder.video_width = video_width/2;
      mediaRecorder.video_height = video_height/2;

      mediaRecorder.ondataavailable = function (blob) {
         // console.log("new data available!");
          video_container.innerHTML = "";

          // convert data into base 64 blocks
          blob_to_base64(blob,function(b64_data){
            cur_video_blob = b64_data;
          });
      };
    }

    // callback if there is an error when we try and get the video stream
    var onMediaError = function(e) {
      console.error('media error', e);
    }

    // get video stream from user. see https://github.com/streamproc/MediaStreamRecorder
    navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError);
  }



 var record = function(mediaRecorder){
	 time=3;
	 document.getElementById("second_counter").style.display="block";
	 document.getElementById("webcam_stream").style.display="block";
	 mediaRecorder.start(video_length);
	 setTimeout(function(){document.getElementById("webcam_stream").style.display="none"}, pause);
	 setTimeout(function(){document.getElementById("second_counter").style.display="none"}, pause);	 
  }

// check to see if a message qualifies to be replaced with video.
  var has_new_emotions = function(msg){
    //var options = ["lol",":)",":("];
    for(var i=0;i<popular.length;i++){
      if(msg.indexOf(popular[i])!= -1 && emojis.indexOf(popular[i])==-1){
      	var takeVideo = window.confirm("Do you want to record a video for "+popular[i]+"?");
      	console.log(takeVideo);
      	if(takeVideo==true){
      	    emojis.push(popular[i]);
      		console.log("yes");
      	   	record(mediaRecorder);
      	   	setTimeout(function(){saveVideo(popular[i])},pause);
	  	  	setTimeout(function(){delete popular[i];},pause);
		  	return true;
      	}else{
	      	delete popular[i]; //removes emoticon from the popular list so we don't prompt again
		  	return false;
      	}
      }
    }
    return false;
  }
  
    // check to see if a message qualifies to be replaced with video.
  var has_old_emotions = function(msg){
    for(var i=0;i<emojis.length;i++){
      if(msg.indexOf(emojis[i])!= -1){
      	return emojis[i];
      }
    }
  //  console.log("returning");
    return false;
  }
  
  
  var saveVideo = function(string){
	  //console.log("saving");
	  //library.push({string: string, video:cur_video_blob});
	  library[string]=cur_video_blob;
	  var video = document.createElement("video");
	  var container = document.createElement("div");
	  video.autoplay = true;
	  video.controls = false; // optional
	  video.loop = true;
	  video.width = 120;
	  video.style.borderRadius="50%";
	  var source = document.createElement("source");
	  source.src =  URL.createObjectURL(base64_to_blob(library[string]));
	  console.log("library"+source.src);
	  source.type =  "video/webm";
	  video.title=string;
	  video.appendChild(source);
	  var title = document.createElement("h2");
	  title.innerText=string;
	  var delete_button = document.createElement("input");
	  delete_button.type="button";
	  delete_button.value="X";
	  delete_button.className="delete";
	  delete_button.class="delete";
	  container.appendChild(delete_button);
	  container.appendChild(video);
	  container.appendChild(title);
	  document.getElementById("library").appendChild(container);
	  delete_button.style.top=video.style.top;
	  console.log(video.style.top);
	  delete_button.addEventListener("click", function(){
		 // emojis.splice(emojis.indexOf($(this).next().text()), 1);
		 delete emojis[emojis.indexOf($(this).next().next().text())];
		 delete library[$(this).next().next().text()];
		 console.log(library);
		 $(this).next().remove();
		 $(this).next().remove();
		 $(this).remove();
	});
  };
  


  // some handy methods for converting blob to base 64 and vice versa
  // for performance bench mark, please refer to http://jsperf.com/blob-base64-conversion/5
  // note useing String.fromCharCode.apply can cause callstack error
  var blob_to_base64 = function(blob, callback) {
    var reader = new FileReader();
    reader.onload = function() {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      callback(base64);
    };
    reader.readAsDataURL(blob);
  };

  var base64_to_blob = function(base64) {
    var binary = atob(base64);
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i);
    }
    var blob = new Blob([view]);
    return blob;
  };

})();
