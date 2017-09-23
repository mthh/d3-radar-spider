(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('d3')) :
	typeof define === 'function' && define.amd ? define(['d3'], factory) :
	(global.RadarChart = factory(global.d3));
}(this, (function (d3) { 'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var max = Math.max;
var sin = Math.sin;
var cos = Math.cos;
var HALF_PI = Math.PI / 2;

var wrap = function wrap(_text, width) {
  _text.each(function () {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        lineHeight = 1.4,
        // ems
    y = text.attr('y'),
        x = text.attr('x'),
        dy = parseFloat(text.attr('dy'));
    var line = [],
        lineNumber = 0;
    var tspan = text.text(null).append('tspan').attr('x', x).attr('y', y).attr('dy', dy + 'em');

    var word = words.pop();
    while (word) {
      line.push(word);
      tspan.text(line.join(' '));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(' '));
        line = [word];
        tspan = text.append('tspan').attr('x', x).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').text(word);
      }
      word = words.pop();
    }
  });
};

var move = function move(array, from, to) {
  array.splice(to, 0, array.splice(from, 1)[0]);
  return array;
};

var swap = function swap(array, ix1, ix2) {
  // eslint-disable-line no-param-reassign
  var _ref = [array[ix2], array[ix1]];
  array[ix1] = _ref[0];
  array[ix2] = _ref[1];
  return array;
};

var RadarChart = function () {
  function RadarChart(parent_selector, data, options) {
    var _this = this;

    _classCallCheck(this, RadarChart);

    var self = this;
    var labelClicked = function labelClicked() {
      var ix = +this.id;
      if (ix + 1 === self.allAxis.length) {
        for (var i = 0; i < self.data.length; i++) {
          swap(self.data[i].axes, ix, 0);
        }
      } else {
        var new_ix = ix + 1;
        for (var _i = 0; _i < self.data.length; _i++) {
          move(self.data[_i].axes, ix, new_ix);
        }
      }
      self.update_data();
    };

    var labelCtxMenu = function labelCtxMenu(label) {
      d3.event.stopPropagation();
      d3.event.preventDefault();
      var ix = +this.id;
      self.inverse_data(label);
    };

    var cfg = {
      w: 600, // Width of the circle
      h: 600, // Height of the circle
      margin: { top: 20, right: 20, bottom: 20, left: 20 }, // The margins of the SVG
      levels: 3, // How many levels or inner circles should there be drawn
      maxValue: 0, // What is the value that the biggest circle will represent
      labelFactor: 1.25, // How much farther than the radius of the outer circle should the labels be placed
      wrapWidth: 70, // The number of pixels after which a label needs to be given a new line
      opacityArea: 0.35, // The opacity of the area of the blob
      dotRadius: 4, // The size of the colored circles of each blog
      opacityCircles: 0.1, // The opacity of the circles of each blob
      strokeWidth: 2, // The width of the stroke around each blob
      roundStrokes: false, // If true the area and stroke will follow a round path (cardinal-closed)
      color: d3.scaleOrdinal(d3.schemeCategory10), // Color function,
      format: '.2%', // The format string to be used by d3.format
      unit: '', // The unit to display after the number on the axis and point tooltips (like $, €, %, etc)
      legend: false,
      allowInverseData: false
    };

    // Put all of the options into a variable called cfg
    if (typeof options !== 'undefined') {
      for (var i in options) {
        if (typeof options[i] !== 'undefined') {
          cfg[i] = options[i];
        }
      }
    }
    var ref_ids = [];
    this.data = data.slice();
    // If the supplied maxValue is smaller than the actual one, replace by the max in the data
    // var maxValue = max(cfg.maxValue, d3.max(data, function(i){return d3.max(i.map(function(o){return o.value;}))}));
    var maxValue = 0;
    for (var j = 0; j < this.data.length; j++) {
      var on_axes = [];
      for (var _i2 = 0; _i2 < this.data[j].axes.length; _i2++) {
        this.data[j].axes[_i2].id = this.data[j].name;
        on_axes.push(this.data[j].name);
        if (this.data[j].axes[_i2].value > maxValue) {
          maxValue = this.data[j].axes[_i2].value;
        }
        ref_ids.push(on_axes);
      }
    }
    maxValue = max(cfg.maxValue, maxValue);
    this.allAxis = this.data[0].axes.map(function (i) {
      return i.axis;
    }); // Names of each axis
    var total = this.allAxis.length,
        // The number of different axes
    radius = Math.min(cfg.w / 2, cfg.h / 2),
        // Radius of the outermost circle
    Format = d3.format(cfg.format),
        // Formatting
    angleSlice = Math.PI * 2 / total; // The width in radians of each "slice"

    // Scale for the radius
    var rScale = d3.scaleLinear().range([0, radius]).domain([0, maxValue]);

    // ///////////////////////////////////////////////////////
    // ////////// Create the container SVG and g /////////////
    // ///////////////////////////////////////////////////////
    var parent = d3.select(parent_selector);

    // Remove whatever chart with the same id/class was present before
    parent.select('svg').remove();

    // Initiate the radar chart SVG
    var svg = parent.append('svg').attr('width', cfg.w + cfg.margin.left + cfg.margin.right).attr('height', cfg.h + cfg.margin.top + cfg.margin.bottom).attr('class', 'radar');

    // Append a g element
    var g = svg.append('g').attr('transform', 'translate(' + (cfg.w / 2 + cfg.margin.left) + ',' + (cfg.h / 2 + cfg.margin.top) + ')');

    // ///////////////////////////////////////////////////////
    // //////// Glow filter for some extra pizzazz ///////////
    // ///////////////////////////////////////////////////////

    // Filter for the outside glow
    var filter = g.append('defs').append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur');
    var feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // ///////////////////////////////////////////////////////
    // ///////////// Draw the Circular grid //////////////////
    // ///////////////////////////////////////////////////////

    // Wrapper for the grid & axes
    var axisGrid = g.append('g').attr('class', 'axisWrapper');

    // Draw the background circles
    axisGrid.selectAll('.levels').data(d3.range(1, cfg.levels + 1).reverse()).enter().append('circle').attr('class', 'gridCircle').attr('r', function (d) {
      return radius / cfg.levels * d;
    }).style('fill', '#CDCDCD').style('stroke', '#CDCDCD').style('fill-opacity', cfg.opacityCircles).style('filter', 'url(#glow)');

    // Text indicating at what % each level is
    axisGrid.selectAll('.axisLabel').data(d3.range(1, cfg.levels + 1).reverse()).enter().append('text').attr('class', 'axisLabel').attr('x', 4).attr('y', function (d) {
      return -d * radius / cfg.levels;
    }).attr('dy', '0.4em').style('font-size', '10px').attr('fill', '#737373').text(function (d) {
      return Format(maxValue * d / cfg.levels) + cfg.unit;
    });

    // Create the straight lines radiating outward from the center
    var axis = axisGrid.selectAll('.axis').data(this.allAxis).enter().append('g').attr('class', 'axis');
    // Append the lines
    axis.append('line').attr('x1', 0).attr('y1', 0).attr('x2', function (d, i) {
      return rScale(maxValue * 1.1) * cos(angleSlice * i - HALF_PI);
    }).attr('y2', function (d, i) {
      return rScale(maxValue * 1.1) * sin(angleSlice * i - HALF_PI);
    }).attr('class', 'line').style('stroke', 'white').style('stroke-width', '2px');

    // Append the labels at each axis
    axis.append('text').attr('class', 'legend').style('font-size', '11px').attr('id', function (d, i) {
      return i;
    }).attr('text-anchor', 'middle').attr('dy', '0.35em').attr('x', function (d, i) {
      return rScale(maxValue * cfg.labelFactor) * cos(angleSlice * i - HALF_PI);
    }).attr('y', function (d, i) {
      return rScale(maxValue * cfg.labelFactor) * sin(angleSlice * i - HALF_PI);
    }).text(function (d) {
      return d;
    }).on('click', labelClicked).on('contextmenu', cfg.allowInverseData ? labelCtxMenu : null).call(wrap, cfg.wrapWidth);

    // ///////////////////////////////////////////////////////
    // /////////// Draw the radar chart blobs ////////////////
    // ///////////////////////////////////////////////////////

    // The radial line function
    this.radarLine = d3.radialLine().curve(cfg.roundStrokes ? d3.curveCardinalClosed : d3.curveLinearClosed).radius(function (d) {
      return rScale(d.value);
    }).angle(function (d, i) {
      return i * angleSlice;
    });

    // Create a wrapper for the blobs
    var blobWrapper = g.selectAll('.radarWrapper').data(this.data).enter().append('g').attr('class', 'radarWrapper');

    // Append the backgrounds
    blobWrapper.append('path').attr('class', 'radarArea').attr('d', function (d) {
      return _this.radarLine(d.axes);
    }).style('fill', function (d, i) {
      return cfg.color(i);
    }).style('fill-opacity', 0).style('fill-opacity', cfg.opacityArea).on('mouseover', function () {
      // Dim all blobs
      blobWrapper.selectAll('.radarArea').transition().duration(200).style('fill-opacity', 0.1);
      // Bring back the hovered over blob
      d3.select(this).transition().duration(200).style('fill-opacity', 0.7);
    }).on('mouseout', function () {
      // Bring back all blobs
      blobWrapper.selectAll('.radarArea').transition().duration(200).style('fill-opacity', cfg.opacityArea);
    });
    // .on('click', function () {
    //   const p = this.parentElement;
    //   if (p.previousSibling.className !== 'tooltip') {
    //     const group = g.node();
    //     group.insertBefore(p, group.querySelector('.tooltip'));
    //     const new_order = [];
    //     g.selectAll('.radarWrapper').each(d => new_order.push(d.name));
    //     new_order.reverse();
    //     updateLegend(new_order);
    //   }
    // });

    // Create the outlines
    blobWrapper.append('path').attr('class', 'radarStroke').attr('d', function (d) {
      return _this.radarLine(d.axes);
    }).style('stroke-width', cfg.strokeWidth + 'px').style('stroke', function (d, i) {
      return cfg.color(i);
    }).style('fill', 'none').style('filter', 'url(#glow)');

    // Append the circles
    blobWrapper.selectAll('.radarCircle').data(function (d) {
      return d.axes;
    }).enter().append('circle').attr('class', 'radarCircle').attr('r', cfg.dotRadius).attr('cx', function (d, i) {
      return rScale(d.value) * cos(angleSlice * i - HALF_PI);
    }).attr('cy', function (d, i) {
      return rScale(d.value) * sin(angleSlice * i - HALF_PI);
    }).style('fill', function (d) {
      return cfg.color(d.id);
    }).style('fill-opacity', 0.8);

    var tooltip = g.append('text').attr('class', 'tooltip').attr('x', 0).attr('y', 0).style('font-size', '12px').style('display', 'none').attr('text-anchor', 'middle').attr('dy', '0.35em');

    // ///////////////////////////////////////////////////////
    // ////// Append invisible circles for tooltip ///////////
    // ///////////////////////////////////////////////////////

    // Wrapper for the invisible circles on top
    var blobCircleWrapper = g.selectAll('.radarCircleWrapper').data(this.data).enter().append('g').attr('class', 'radarCircleWrapper');

    // Append a set of invisible circles on top for the mouseover pop-up
    blobCircleWrapper.selectAll('.radarInvisibleCircle').data(function (d) {
      return d.axes;
    }).enter().append('circle').attr('class', 'radarInvisibleCircle').attr('r', cfg.dotRadius * 1.5).attr('cx', function (d, i) {
      return rScale(d.value) * cos(angleSlice * i - HALF_PI);
    }).attr('cy', function (d, i) {
      return rScale(d.value) * sin(angleSlice * i - HALF_PI);
    }).style('fill', 'none').style('pointer-events', 'all').on('mouseover', function (d) {
      tooltip.attr('x', this.cx.baseVal.value - 10).attr('y', this.cy.baseVal.value - 10).transition().style('display', 'block').text(Format(d.value) + cfg.unit);
    }).on('mouseout', function () {
      tooltip.transition().style('display', 'none').text('');
    });

    if (cfg.legend !== false && _typeof(cfg.legend) === 'object') {
      var legendZone = svg.append('g').attr('id', 'legendZone').attr('class', 'legend').attr('transform', 'translate(' + cfg.legend.translateX + ',' + (cfg.legend.translateY + 20) + ')');
      var names = this.data.map(function (el) {
        return el.name;
      });
      if (cfg.legend.title) {
        legendZone.append('text').attr('class', 'title').attr('transform', 'translate(0, -20)').attr('x', cfg.w - 70).attr('y', 10).attr('font-size', '12px').attr('fill', '#404040').text(cfg.legend.title);
      }
      var legend = legendZone.selectAll('g').data(names).enter().append('g');

      // Create rectangles markers
      legend.append('rect').attr('x', cfg.w - 65).attr('y', function (d, i) {
        return i * 20;
      }).attr('width', 10).attr('height', 10).style('fill', function (d) {
        return cfg.color(d);
      });
      // Create labels
      legend.append('text').attr('x', cfg.w - 52).attr('y', function (d, i) {
        return i * 20 + 9;
      }).attr('font-size', '11px').attr('fill', '#737373').text(function (d) {
        return d;
      });
    }

    this.g = g;
    this.axisGrid = axisGrid;
    this.rScale = rScale;
    this.cfg = cfg;
    this.maxValue = maxValue;
    this.angleSlice = angleSlice;

    if (cfg.allowInverseData) {
      this.inverse_data = function (field) {
        var data_length = _this.data.length;
        if (!field) {
          for (var _i3 = 0; _i3 < data_length; _i3++) {
            var ax = _this.data[_i3].axes;
            for (var _j = 0; _j < ax.length; _j++) {
              ax[_j].value = 100 - ax[_j].value;
            }
          }
        } else {
          for (var _i4 = 0; _i4 < data_length; _i4++) {
            var _ax = _this.data[_i4].axes;
            for (var _j2 = 0; _j2 < _ax.length; _j2++) {
              if (_ax[_j2].axis === field) {
                _ax[_j2].value = 100 - _ax[_j2].value;
              }
            }
          }
        }
        _this.update_data();
      };
    }
  }

  _createClass(RadarChart, [{
    key: 'add_element',
    value: function add_element(elem) {
      var n_axis = elem.axes.map(function (i) {
        return i.axis;
      });
      if (!(JSON.stringify(n_axis) === JSON.stringify(this.allAxis))) {
        throw new Error('Expected element with same axes name than existing data.');
      }
      this.data.push(elem);
    }
  }, {
    key: 'changeOrder',
    value: function changeOrder() {
      this.data = this.data.slice(1, this.data.length).concat(this.data.slice(0, 1));
      this.update_data();
    }
  }, {
    key: 'update_data',
    value: function update_data(new_data) {
      var _this2 = this;

      var rScale = this.rScale;
      var maxValue = this.maxValue;
      var cfg = this.cfg;
      var angleSlice = this.angleSlice;

      if (new_data) {
        var new_axis = new_data[0].axes.map(function (elem) {
          return elem.axis;
        });
        if (!(JSON.stringify(n_axis) === JSON.stringify(this.allAxis))) {
          throw new Error('Expected element with same axes name than existing data.');
        }
        this.data = new_data;
        this.allAxis = new_axis;
      } else {
        this.allAxis = this.data[0].axes.map(function (elem) {
          return elem.axis;
        });
      }

      var update_axis = this.axisGrid.selectAll('.axis').data(this.allAxis);

      var t = this.g.selectAll('.radarWrapper').transition().duration(225);
      // .on('end', () => {
      //   parent.selectAll('text.legend')
      //     .text(d => d)
      //     .call(wrap, cfg.wrapWidth);
      //   // wrap(parent.selectAll('text.legend'), cfg.wrapWidth);
      // });
      update_axis.select('text.legend').attr('id', function (d, i) {
        return i;
      }).attr('x', function (d, i) {
        return rScale(maxValue * cfg.labelFactor) * cos(angleSlice * i - HALF_PI);
      }).attr('y', function (d, i) {
        return rScale(maxValue * cfg.labelFactor) * sin(angleSlice * i - HALF_PI);
      }).text(function (d) {
        return d;
      }).call(wrap, cfg.wrapWidth);

      var update_blobWrapper = this.g.selectAll('.radarWrapper').data(this.data);

      update_blobWrapper.select('.radarArea').transition(t).attr('d', function (d) {
        return _this2.radarLine(d.axes);
      });

      update_blobWrapper.select('.radarStroke').transition(t).attr('d', function (d) {
        return _this2.radarLine(d.axes);
      });

      var circle = update_blobWrapper.selectAll('.radarCircle').data(function (d) {
        return d.axes;
      });
      circle.transition(t).attr('cx', function (d, i) {
        return rScale(d.value) * cos(angleSlice * i - HALF_PI);
      }).attr('cy', function (d, i) {
        return rScale(d.value) * sin(angleSlice * i - HALF_PI);
      }).style('fill', function (d) {
        return cfg.color(d.id);
      }).style('fill-opacity', 0.8);

      var update_blobCircleWrapper = this.g.selectAll('.radarCircleWrapper').data(this.data);

      var invisibleCircle = update_blobCircleWrapper.selectAll('.radarInvisibleCircle').data(function (d) {
        return d.axes;
      });
      invisibleCircle.transition(t).attr('cx', function (d, i) {
        return rScale(d.value) * cos(angleSlice * i - HALF_PI);
      }).attr('cy', function (d, i) {
        return rScale(d.value) * sin(angleSlice * i - HALF_PI);
      });
    }
  }, {
    key: 'round_stroke',
    value: function round_stroke(val) {
      if (val === undefined) {
        return this.cfg.roundStrokes;
      } else if (val !== this.cfg.roundStrokes) {
        this.cfg.roundStrokes = val;
        this.radarLine = d3.radialLine().curve(this.cfg.roundStrokes ? d3.curveCardinalClosed : d3.curveLinearClosed).radius(function (d) {
          return rScale(d.value);
        }).angle(function (d, i) {
          return i * angleSlice;
        });
        this.update_data();
      }
      return val;
    }
  }]);

  return RadarChart;
}();

return RadarChart;

})));
