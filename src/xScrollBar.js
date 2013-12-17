(function($) {
	var defaultOpts = {
		barTopToWin: 0,
		gap: 15,
		minDraggerHeight: 20,
		enableAnimate: true,
		animateTime: 1000,
		animateType: 'easeOutCubic'
	}, $doc = $(document);

	function ScrollBar(opts) {
		this._opts = $.extend(defaultOpts, opts);
		this._constructor();
	}

	ScrollBar.prototype = {
		_constructor: function() {
			this._attrdb = {};
			this._initDoms();
			this._initEvents();
			this.resetScrollBar();
		},
		_initDoms: function() {
			this._$dom = this._opts.doomroot;
			this._$window = this._$dom;
			this._$content = this._$dom.find('#js_content');
			this._$scrollbar = this._$dom.find('#js_scrollbar');
			this._$dragger = this._$scrollbar.find('#js_dragger');
		},
		_initEvents: function() {
			this._$window.on('mousewheel', $.proxy(this._mouseWheelHandler, this));
			this._$dragger.on('mousedown', $.proxy(this._mouseDraggerHandler, this));
			this._$scrollbar.on('click', $.proxy(this._mouseClickHandler, this));
			this._$dragger.on('click', function(event) {
				event.stopPropagation();
				event.preventDefault();
			});
		},
		_cacheFuncProxyer: function(funcName) {
			var __localData = this._attrdb[this.sizeName];
			if (__localData) {
				return __localData && __localData['_' + funcName] || this[funcName]();
			} else {
				throw new Error('没有值')
			}
		},
		resetScrollBar: function() {

			this.updateCache();

			if (this._cacheFuncProxyer('hasScrollBar')) {
				this._$scrollbar.height(this._cacheFuncProxyer('_getScrollBarHeight')).css({
					top: this._opts.barTopToWin
				});
				this._resetDragger();
			} else {
				this._$scrollbar.hide();
			}
		},
		updateCache: function() {
			var ctH = this._getContentHeight(),
				winH = this._getWindowHeight();
			this.sizeName = ctH + '_' + winH;
			//如果缓存已经存在
			if (this.sizeName in this._attrdb) {
				return;
			}

			this._attrdb[this.sizeName] = {};
			//改变尺寸后，需要以下方法需要重新计算
			var cacheMethodsArr = ['_getContentHeight', '_getWindowHeight', '_getMaxMT', 'hasScrollBar',
				'_getScrollBarHeight', '_getMaxDraggerTop', '_getGapByMinDragger', '_getDraggerHeight'
			];

			for (var i = 0; i < cacheMethodsArr.length; i++) {
				var methodName = cacheMethodsArr[i];
				this._attrdb[this.sizeName]['_' + methodName] = this[methodName]();
			}
		},
		_resetDragger: function() {
			var draggerHeight = this._cacheFuncProxyer('_getDraggerHeight');
			var minDraggerHeight = this._opts.minDraggerHeight;
			if (draggerHeight > minDraggerHeight) { //如果dragger调试大于最小高度
				this._$dragger.height(draggerHeight);
				delete this._dynamicGap; //取消动态计算得来的gap
				delete this._dynamicDraggerHeight; // 取消使用最小高度
			} else {
				this._$dragger.height(minDraggerHeight);
				this._dynamicDraggerHeight = minDraggerHeight;
				this._dynamicGap = this._cacheFuncProxyer('_getDraggerHeight');
			}
		},
		_getWindowHeight: function() {
			return this._$window.height();
		},
		_getContentHeight: function() {
			return this._$content.height();
		},
		_getGapByMinDragger: function() {
			return this._cacheFuncProxyer('_getMaxMT') / (this._cacheFuncProxyer('_getScrollBarHeight') - this._opts.minDraggerHeight);
		},
		_getDraggerHeight: function() {
			return this._dynamicDraggerHeight || this._cacheFuncProxyer('_getScrollBarHeight') - this._cacheFuncProxyer('_getMaxMT') / this._opts.gap;
		},
		_getScrollBarHeight: function() {
			return this._cacheFuncProxyer('_getWindowHeight') - this._opts.barTopToWin * 2;
		},
		//获取scrollBar 最大的移动距离
		_getMaxDraggerTop: function() {
			return this._cacheFuncProxyer('_getScrollBarHeight') - this._cacheFuncProxyer('_getDraggerHeight');
		},
		_getMaxMT: function() {
			return this._cacheFuncProxyer('_getContentHeight') - this._cacheFuncProxyer('_getWindowHeight');
		},
		hasScrollBar: function() {
			return this._cacheFuncProxyer('_getMaxMT') > 0;
		},
		_getGap: function() {
			return this._dynamicGap || this._opts.gap;
		},
		_unbindDragEvents: function() {
			$doc.unbind('mousemove', this._mouseMove);
			$doc.unbind('mouseup', this._unbindDragEvents);
		},
		//点击滚动条时逻辑处理
		_mouseClickHandler: function(event) {
			var mousePosY = this._getMousePos(event);
			var barPos = this._getDraggerTop();
			if (mousePosY < barPos) { //如果点击的是滚动bar上方
				var upInterval = barPos - mousePosY;
				this._execScrolling(upInterval * -1, upInterval * this._getGap());
			} else {
				var downInterval = mousePosY - (barPos + this._getDraggerHeight());
				this._execScrolling(downInterval, downInterval * this._getGap() * -1);
			}
		},
		//鼠标滚动时逻辑处理
		_mouseWheelHandler: function(event, delta, deltaX, deltaY) {
			if (this._cacheFuncProxyer('hasScrollBar')) {
				this._execScrolling(delta * -1, delta * this._getGap());
			}
		},
		//获取鼠标在滚动条的位置
		_getMousePos: function(event) {
			return event.offsetY || event.pageY - this._$scrollbar.offset().top;
		},
		//鼠标拖拽滚动条时逻辑处理--mousedown
		_mouseDraggerHandler: function(event) {
			this._startMousePos = {
				x: event.pageX,
				y: event.pageY
			};
			$doc.on('mousemove', $.proxy(this._mouseMove, this));
			$doc.on('mouseup', $.proxy(this._unbindDragEvents, this));
		},
		//鼠标拖拽滚动条时逻辑处理--mousemove
		_mouseMove: function(event) {
			var interval = event.pageY - this._startMousePos.y;
			this._execScrolling(interval, interval * this._getGap() * -1)
			this._startMousePos.y = event.pageY;
		},
		//滚动总驱动入口,
		_execScrolling: function(dragger_offset, scroll_offset) {
			this._moveDraggerByTop(this._getDraggerTop() + dragger_offset); //移动dragger
			this._scrollToByMT(this._getCurrentMT() + scroll_offset); //移动scrollview
		},
		_getCurrentMT: function() {
			return this._currentMT || 0;
		},
		_getDraggerTop: function() {
			return this._draggerTop || 0;
		},
		//内部函数===>处理内容gundong
		_scrollToByMT: function(mt) {
			var opts = this._opts;
			var __maxMT = this._cacheFuncProxyer('_getMaxMT') * -1; //转换为负值
			if (mt > 0) {
				mt = 0;
			} else if (mt < __maxMT) {
				mt = __maxMT;
			}
			this._currentMT = mt;
			if (this._opts.enableAnimate) {
				this._$content.stop(true);
				this._$content.animate({
					'margin-top': mt
				}, opts.animateTime, opts.animateType);
			} else {
				this._$content.css('margin-top', mt);
			}
		},
		//内部函数==>处理滚动条移动
		_moveDraggerByTop: function(top) {
			var maxTop = this._cacheFuncProxyer('_getMaxDraggerTop');
			if (top < 0) {
				top = 0;
			} else if (top > maxTop) {
				top = maxTop;
			}
			this._draggerTop = top;
			this._$dragger.css('top', top);
		}
	};

	window.xScrollBar = ScrollBar;

})(jQuery);