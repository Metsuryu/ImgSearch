var apiKey = "df3379c4e3902c0937b1780d4f335746";
var jsonFormat = "&format=json&nojsoncallback=1";
var thumbnailSize = "n"; //n is 320px on the longest side  https://www.flickr.com/services/api/misc.urls.html
var currentSearchQuery = "";
var currentPage = 0;
var imagesPerPage = 25;

function newSearch (){
	currentSearchQuery = "";
	var textToSearch, thumbToDisplay = "";
	//Get first page for a new search
	var pageNumber = 1;
	//Remove all current results
	$("#results").empty();

	textToSearch = $("#searchInput").val().trim();
	if (!textToSearch) {
		displayMessage("You must enter something in the search field");
		$("#searchInput").focus();
		return;
	}

	var searchURL = "https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key="+apiKey;
	//currentSearchQuery is used for infinite scrolling
	currentSearchQuery = searchURL +
	"&per_page="+imagesPerPage+
	"&text="+textToSearch+
	jsonFormat;
	var searchQuery = currentSearchQuery + "&page="+pageNumber;

	//Get results from flickr
	$.getJSON(searchQuery, function(jsonResult){
		if (!jsonResult || !jsonResult.photos) {
			//An error occurred
			displayMessage("Something went wrong");
			return;
		}
		if (!jsonResult.photos.photo[0]) {
			//No results
			displayMessage("Nothing was found");
			return;
		}

		//Results found, get first page
		currentPage = pageNumber;
		//Get thumbnail from each image
		$.each(jsonResult.photos.photo, function(index, currentImage){
			var photoID = currentImage.id;
			thumbToDisplay = "https://farm"+currentImage.farm+".staticflickr.com/"+currentImage.server+"/"+photoID+"_"+currentImage.secret+"_"+thumbnailSize+".jpg";
			//Then get the largest available size
			getSizesCB(thumbToDisplay, photoID);
		}); 
	});
}

//Called when scrolling to the bottom of the page, loads more results
function loadMore (){
	var nextPageNumber = parseInt(currentPage) + 1;
	var nextPage = currentSearchQuery + "&page="+nextPageNumber;

	//Get results from flickr
	$.getJSON(nextPage, function(jsonResult){
		if (!jsonResult.photos.photo[0]) {
			//No more results
			displayMessage("End of results");
			return;
		}

		//Results found, get first page
		currentPage = nextPageNumber;
		//Get thumbnail from each image
		$.each(jsonResult.photos.photo, function(index, currentImage){
			var photoID = currentImage.id;
			var thumbToDisplay = "https://farm"+currentImage.farm+".staticflickr.com/"+currentImage.server+"/"+photoID+"_"+currentImage.secret+"_"+thumbnailSize+".jpg";
			//Then get the largest available size
			getSizesCB(thumbToDisplay, photoID);
		}); 
	});
}

//Display an info message
function displayMessage (message){
	$("#results").append('<p class="info">'+message+'</p>');
}

//Get the available image sizes
function getSizesCB (thumbToDisplay, photoID){
	var getSizesURL = "https://api.flickr.com/services/rest/?method=flickr.photos.getSizes&api_key="+apiKey+"&photo_id=";
	var largestResolution = 0;
	var getSizes = getSizesURL+photoID+jsonFormat;
	$.getJSON(getSizes, function(jsonSizes){
		//Get largest available resolution for fullscreen
		var largestSoFarW = 0;
		$.each(jsonSizes.sizes.size, function(index, currentImageSize){
			if (currentImageSize.width >= largestSoFarW) {
				largestSoFarW = currentImageSize.width;
				largestResolution = currentImageSize;
			}
		});
		//Finally append the element to the page.
		appendImage(thumbToDisplay, largestResolution.source, photoID);
	});
}

//Append to the page the thumbnail, and the largest available version of the image.
function appendImage (thumbnail, largestRes, photoID){
	var newImage = '<a class="photo" id="'+photoID+'" href="'+largestRes+'"><img src="'+thumbnail+'"></a>';
	$("#results").append(newImage);
}

function getImageInfo (imageID, imageURL){
	var imageInfoURL = "https://api.flickr.com/services/rest/?method=flickr.photos.getInfo&api_key="+apiKey+"&photo_id="+imageID+jsonFormat;
	var username, title, description = "";
	$.getJSON(imageInfoURL, function(jsonInfo){
		//If info can't be retrived, use an empty string.
		username = jsonInfo.photo.owner.username || "";
		title = jsonInfo.photo.title._content || "";
		description = jsonInfo.photo.description._content || "";
		var imageInfo = {
			"username": username,
			"title": title,
			"description": description
			};
		maximizeImage(imageID, imageURL, imageInfo);
	});
}

//Maximizes the image to fullscreen
function maximizeImage (imageID, imageURL, imageInfo){
	//imageInfo has username, title, and description
	var usernameLink = "https://www.flickr.com/photos/";

	//The window that will contain the image to be displayed.
	//Multiline for readability.
	//Starts as hidden so the image has some time to load before it appears.
	var displayWindow = '\
<div id="fullScreenWindow" hidden> \
	<h1 id="picTitle">'+imageInfo.title+'</h1> \
	<div id="closeWindow">&times;</div> \
	<div id="picContainer"> \
		<img id="fullScreenPicture" src="'+imageURL+'"> \
	</div> \
	<div id="textContainer">\
	<a id="username" href="'+usernameLink+imageInfo.username+'">'+imageInfo.username+'</a>\
	<p id="description">'+imageInfo.description+'</p> \
	</div> \
</div>';
	dimAndDisablePage();
	var dWindow = $(displayWindow);
	$("#windowContainer").append(dWindow);
	//Move image to current position before making it visible.
	$(dWindow).animate({"marginTop": ($(window).scrollTop() ) + "px"}, "fast" );
	//and fade in.
	$(dWindow).fadeIn("slow");
}

function dimAndDisablePage (){
	$("#basePage").css("opacity", "0.5");
	$("#basePage").css("pointer-events", "none");
	$("body").css("background-color","#000");
}

function reverseDimAndDisablePage (){
	$("#basePage").css("opacity", "1");
	$("#basePage").css("pointer-events", "auto");
	$("body").css("background-color","#fff");
}

$(document).ready(function(){

	$("#searchBTN").click(function(event){
		//To not refresh the page on search.
		event.preventDefault();
		newSearch();
	});

	//Open a picture at full resolution and display its info
	$("#results").on("click", ".photo", function(event) {
		event.preventDefault();
		var thisPicParent = $(event.target).parent()[0];
		var PicID = thisPicParent.id;
		var thisPicURL = thisPicParent.href;
		getImageInfo (PicID, thisPicURL);
	});

	//Close the currently open image
	$("#windowContainer").on("click", "#closeWindow", function(event) {
		event.preventDefault();
		$("#windowContainer").empty();
		reverseDimAndDisablePage();
	});
	//Also close any open image on ESC keypress
	$(document).keyup(function(e) {
		if (e.keyCode == 27) { // escape key maps to keycode "27"
			$("#windowContainer").empty();
			reverseDimAndDisablePage();
		}
	});

	$(window).scroll(function(){
		//When page is scrolled to the bottom, load more elements
		if ($(window).height() + $(window).scrollTop() === $(document).height() ) {
			loadMore();
		}
	});
});