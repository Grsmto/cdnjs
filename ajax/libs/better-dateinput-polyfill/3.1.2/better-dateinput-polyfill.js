/**
 * better-dateinput-polyfill: input[type=date] polyfill for better-dom
 * @version 3.1.2 Sun, 18 Nov 2018 13:15:41 GMT
 * @link https://github.com/chemerisuk/better-dateinput-polyfill
 * @copyright 2018 Maksim Chemerisuk
 * @license MIT
 */
;

(function () {
  "use strict";

  var MAIN_CSS = "dateinput-picker{display:inline-block;vertical-align:bottom}dateinput-picker>object{width:21rem;max-height:calc(2.5rem*8);box-shadow:0 0 15px gray;background:white;position:absolute;opacity:1;-webkit-transform:translate3d(0,0,0);transform:translate3d(0,0,0);-webkit-transform-origin:0 0;transform-origin:0 0;transition:.1s ease-out}dateinput-picker[aria-hidden=true]>object{opacity:0;-webkit-transform:skew(-25deg) scaleX(.75);transform:skew(-25deg) scaleX(.75);visibility:hidden;height:0}dateinput-picker[aria-expanded=true]>object{max-height:calc(2.5rem + 3.75rem*3)}dateinput-picker+input{color:transparent!important;caret-color:transparent!important}dateinput-picker+input::selection{background:transparent}dateinput-picker+input::-moz-selection{background:transparent}";
  var PICKER_CSS = "body{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;line-height:2.5rem;text-align:center;cursor:default;-webkit-user-select:none;-ms-user-select:none;user-select:none;margin:0;overflow:hidden;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}a{width:3rem;height:2.5rem;position:absolute;text-decoration:none;color:inherit}b{display:block;cursor:pointer}table{width:100%;table-layout:fixed;border-spacing:0;border-collapse:collapse;text-align:center;line-height:2.5rem}td,th{padding:0}thead{background:lightgray;font-size:smaller;font-weight:700}[aria-selected=false],[aria-disabled=true]{color:gray}[aria-selected=true]{box-shadow:inset 0 0 0 1px gray}a:hover,td:hover,[aria-disabled=true],[aria-selected=true]{background-color:whitesmoke}table+table{line-height:3.75rem;background:white;position:absolute;top:2.5rem;left:0;opacity:1;transition:.1s ease-out}table+table[aria-hidden=true]{visibility:hidden!important;opacity:0}";
  var CLICK_EVENT_TYPE = "orientation" in window ? "touchend" : "mousedown";
  var IE = "ScriptEngineMajorVersion" in window;

  var INTL_SUPPORTED = function () {
    try {
      new Date().toLocaleString("i");
    } catch (err) {
      return err instanceof RangeError;
    }

    return false;
  }();

  var TYPE_SUPPORTED = function () {
    // use a stronger type support detection that handles old WebKit browsers:
    // http://www.quirksmode.org/blog/archives/2015/03/better_modern_i.html
    return DOM.create("<input type='date'>").value("_").value() !== "_";
  }();

  var HTML = DOM.get("documentElement"),
      ampm = function ampm(pos, neg) {
    return HTML.lang === "en-US" ? pos : neg;
  },
      formatLocalDate = function formatLocalDate(date) {
    return [date.getFullYear(), ("0" + (date.getMonth() + 1)).slice(-2), ("0" + date.getDate()).slice(-2)].join("-");
  },
      parseLocalDate = function parseLocalDate(value) {
    var valueParts = value.split("-");
    var dateValue = new Date(valueParts[0], valueParts[1] - 1, valueParts[2]);
    return isNaN(dateValue.getTime()) ? null : dateValue;
  };

  function repeat(times, fn) {
    if (typeof fn === "string") {
      return Array(times + 1).join(fn);
    } else {
      return Array.apply(null, Array(times)).map(fn).join("");
    }
  }

  function localeWeekday(index) {
    var date = new Date(Date.UTC(ampm(2001, 2002), 0, index));

    if (INTL_SUPPORTED) {
      try {
        return date.toLocaleDateString(HTML.lang, {
          weekday: "short"
        });
      } catch (err) {}
    }

    return date.toUTCString().split(",")[0].slice(0, 2);
  }

  function localeMonth(index) {
    var date = new Date(Date.UTC(2010, index));

    if (INTL_SUPPORTED) {
      try {
        return date.toLocaleDateString(HTML.lang, {
          month: "short"
        });
      } catch (err) {}
    }

    return date.toUTCString().split(" ")[2];
  }

  function localeMonthYear(month, year) {
    // set hours to '12' to fix Safari bug in Date#toLocaleString
    var date = new Date(year, month, 12);

    if (INTL_SUPPORTED) {
      try {
        return date.toLocaleDateString(HTML.lang, {
          month: "long",
          year: "numeric"
        });
      } catch (err) {}
    }

    return date.toUTCString().split(" ").slice(2, 4).join(" ");
  }

  var PICKER_BODY_HTML = "<a style=\"left:0\">&#x25C4;</a> <a style=\"right:0\">&#x25BA;</a> <b></b><table><thead>" + repeat(7, function (_, i) {
    return "<th>" + localeWeekday(i);
  }) + "</thead><tbody>" + repeat(7, "<tr>" + repeat(7, "<td>") + "</tr>") + "</tbody></table><table><tbody>" + repeat(3, function (_, i) {
    return "<tr>" + repeat(4, function (_, j) {
      return "<td>" + localeMonth(i * 4 + j);
    });
  }) + "</tbody></table>";
  DOM.extend("input[type=date]", {
    constructor: function constructor() {
      var _this = this;

      if (this._isNative()) return false;
      this._svgTextOptions = this.css(["color", "font", "padding-left", "border-left-width", "text-indent", "padding-top", "border-top-width"]);
      this._svgTextOptions.dx = ["padding-left", "border-left-width", "text-indent"].map(function (p) {
        return parseFloat(_this._svgTextOptions[p]);
      }).reduce(function (a, b) {
        return a + b;
      });
      this._svgTextOptions.dy = ["padding-top", "border-top-width"].map(function (p) {
        return parseFloat(_this._svgTextOptions[p]);
      }).reduce(function (a, b) {
        return a + b;
      }) / 2;
      var picker = DOM.create("<dateinput-picker tabindex='-1'>"); // used internally to notify when the picker is ready

      picker._readyCallback = this._initPicker.bind(this, picker); // add <dateinput-picker> to the document

      this.before(picker.hide());
    },
    _isNative: function _isNative() {
      var polyfillType = this.get("data-polyfill"),
          deviceType = "orientation" in window ? "mobile" : "desktop";
      if (polyfillType === "none") return true;

      if (polyfillType && (polyfillType === deviceType || polyfillType === "all")) {
        // remove native browser implementation
        this.set("type", "text"); // force applying the polyfill

        return false;
      }

      return TYPE_SUPPORTED;
    },
    _initPicker: function _initPicker(picker, pickerBody) {
      var calendarCaption = pickerBody.find("b");
      var calenderDays = pickerBody.find("table");
      var calendarMonths = pickerBody.find("table+table");

      var invalidatePicker = this._invalidatePicker.bind(this, calendarMonths, calenderDays);

      var resetValue = this._syncValue.bind(this, picker, invalidatePicker, "defaultValue");

      var updateValue = this._syncValue.bind(this, picker, invalidatePicker, "value");

      var toggleState = this._togglePicker.bind(this, picker, invalidatePicker); // patch value property for the input element


      var valueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
      Object.defineProperty(this[0], "value", {
        configurable: false,
        enumerable: true,
        get: valueDescriptor.get,
        set: this._setValue.bind(this, valueDescriptor.set, updateValue)
      });
      Object.defineProperty(this[0], "valueAsDate", {
        configurable: false,
        enumerable: true,
        get: this._getValueAsDate.bind(this),
        set: this._setValueAsDate.bind(this)
      }); // sync picker visibility on focus/blur

      this.on("focus", this._focusPicker.bind(this, picker, toggleState));
      this.on("blur", this._blurPicker.bind(this, picker));
      this.on("change", updateValue);
      this.on("keydown", ["which"], this._keydownPicker.bind(this, picker, toggleState)); // form events do not trigger any state change

      this.closest("form").on("reset", resetValue); // picker invalidate handlers

      calenderDays.on("picker:invalidate", ["detail"], this._invalidateDays.bind(this, calenderDays));
      calendarMonths.on("picker:invalidate", ["detail"], this._invalidateMonths.bind(this, calendarMonths));
      pickerBody.on("picker:invalidate", ["detail"], this._invalidateCaption.bind(this, calendarCaption, picker)); // picker click handlers

      pickerBody.on(CLICK_EVENT_TYPE, "a", ["target"], this._clickPickerButton.bind(this, picker));
      pickerBody.on(CLICK_EVENT_TYPE, "td", ["target"], this._clickPickerDay.bind(this, picker, toggleState));
      calendarCaption.on(CLICK_EVENT_TYPE, toggleState); // prevent input from loosing the focus outline

      pickerBody.on(CLICK_EVENT_TYPE, function () {
        return false;
      });
      this.on(CLICK_EVENT_TYPE, this._focusPicker.bind(this, picker, toggleState));
      resetValue(); // present initial value
      // display calendar for autofocused elements

      if (DOM.get("activeElement") === this[0]) {
        picker.show();
      }
    },
    _setValue: function _setValue(setter, updateValue, value) {
      var dateValue = parseLocalDate(value);

      if (!dateValue) {
        value = "";
      } else {
        var min = parseLocalDate(this.get("min")) || Number.MIN_VALUE;
        var max = parseLocalDate(this.get("max")) || Number.MAX_VALUE;

        if (dateValue < min) {
          value = formatLocalDate(min);
        } else if (dateValue > max) {
          value = formatLocalDate(max);
        }
      }

      setter.call(this[0], value);
      updateValue();
    },
    _getValueAsDate: function _getValueAsDate() {
      return parseLocalDate(this.value());
    },
    _setValueAsDate: function _setValueAsDate(dateValue) {
      if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
        this.value(formatLocalDate(dateValue));
      }
    },
    _invalidatePicker: function _invalidatePicker(calendarMonths, calenderDays, expanded, dateValue) {
      if (!dateValue || isNaN(dateValue.getTime())) {
        dateValue = this.get("valueAsDate") || new Date();
      }

      var target = expanded ? calendarMonths : calenderDays; // refresh current picker

      target.fire("picker:invalidate", dateValue);

      if (expanded) {
        calendarMonths.show();
      } else {
        calendarMonths.hide();
      }
    },
    _invalidateDays: function _invalidateDays(calenderDays, dateValue) {
      var month = dateValue.getMonth();
      var date = dateValue.getDate();
      var year = dateValue.getFullYear();
      var min = parseLocalDate(this.get("min")) || Number.MIN_VALUE;
      var max = parseLocalDate(this.get("max")) || Number.MAX_VALUE;
      var iterDate = new Date(year, month, 1); // move to beginning of the first week in current month

      iterDate.setDate(1 - iterDate.getDay() - ampm(1, 0)); // update days picker

      calenderDays.findAll("td").forEach(function (day) {
        iterDate.setDate(iterDate.getDate() + 1);
        var mDiff = month - iterDate.getMonth(),
            selectedValue = null,
            disabledValue = null;
        if (year !== iterDate.getFullYear()) mDiff *= -1;

        if (iterDate < min || iterDate > max) {
          disabledValue = "true";
        } else if (mDiff > 0 || mDiff < 0) {
          selectedValue = "false";
        } else if (date === iterDate.getDate()) {
          selectedValue = "true";
        }

        day._ts = iterDate.getTime();
        day.set("aria-selected", selectedValue);
        day.set("aria-disabled", disabledValue);
        day.value(iterDate.getDate());
      });
    },
    _invalidateMonths: function _invalidateMonths(calendarMonths, dateValue) {
      var month = dateValue.getMonth();
      var year = dateValue.getFullYear();
      var min = parseLocalDate(this.get("min")) || Number.MIN_VALUE;
      var max = parseLocalDate(this.get("max")) || Number.MAX_VALUE;
      var iterDate = new Date(year, month, 1);
      calendarMonths.findAll("td").forEach(function (day, index) {
        iterDate.setMonth(index);
        var mDiff = month - iterDate.getMonth(),
            selectedValue = null;

        if (iterDate < min || iterDate > max) {
          selectedValue = "false";
        } else if (!mDiff) {
          selectedValue = "true";
        }

        day._ts = iterDate.getTime();
        day.set("aria-selected", selectedValue);
      });
    },
    _invalidateCaption: function _invalidateCaption(calendarCaption, picker, dateValue) {
      var year = dateValue.getFullYear(); // update calendar caption

      if (picker.get("aria-expanded") === "true") {
        calendarCaption.value(year);
      } else {
        calendarCaption.value(localeMonthYear(dateValue.getMonth(), year));
      }
    },
    _syncValue: function _syncValue(picker, invalidatePicker, propName) {
      var displayText = this.get(propName);
      var dateValue = parseLocalDate(displayText);

      if (dateValue) {
        if (INTL_SUPPORTED) {
          var formatOptions = this.get("data-format");

          try {
            // set hours to '12' to fix Safari bug in Date#toLocaleString
            displayText = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate(), 12).toLocaleDateString(HTML.lang, formatOptions ? JSON.parse(formatOptions) : {});
          } catch (err) {}
        }
      }

      this.css("background-image", "url('data:image/svg+xml," + encodeURIComponent("<svg xmlns=\"http://www.w3.org/2000/svg\"><text x=\"" + this._svgTextOptions.dx + "\" y=\"50%\" dy=\"" + this._svgTextOptions.dy + "\" fill=\"" + this._svgTextOptions.color + "\" style=\"font:" + this._svgTextOptions.font + "\">" + displayText + "</text></svg>") + "')"); // update picker state

      invalidatePicker(picker.get("aria-expanded") === "true", dateValue);
    },
    _clickPickerButton: function _clickPickerButton(picker, target) {
      var sign = target.next("a")[0] ? -1 : 1;
      var targetDate = this.get("valueAsDate") || new Date();

      if (picker.get("aria-expanded") === "true") {
        targetDate.setFullYear(targetDate.getFullYear() + sign);
      } else {
        targetDate.setMonth(targetDate.getMonth() + sign);
      }

      this.value(formatLocalDate(targetDate)).fire("change");
    },
    _clickPickerDay: function _clickPickerDay(picker, toggleState, target) {
      var targetDate;

      if (picker.get("aria-expanded") === "true") {
        if (isNaN(target._ts)) {
          targetDate = new Date();
        } else {
          targetDate = new Date(target._ts);
        } // switch to date calendar mode


        toggleState(false);
      } else {
        if (!isNaN(target._ts)) {
          targetDate = new Date(target._ts);
          picker.hide();
        }
      }

      if (targetDate != null) {
        this.value(formatLocalDate(targetDate)).fire("change");
      }
    },
    _togglePicker: function _togglePicker(picker, invalidatePicker, force) {
      if (typeof force !== "boolean") {
        force = picker.get("aria-expanded") !== "true";
      }

      picker.set("aria-expanded", force);
      invalidatePicker(force);
    },
    _keydownPicker: function _keydownPicker(picker, toggleState, which) {
      if (which === 13 && picker.get("aria-hidden") === "true") {
        // ENTER key should submit form if calendar is hidden
        return true;
      }

      if (which === 32) {
        // SPACE key toggles calendar visibility
        if (!this.get("readonly")) {
          toggleState(false);

          if (picker.get("aria-hidden") === "true") {
            picker.show();
          } else {
            picker.hide();
          }
        }
      } else if (which === 27 || which === 9 || which === 13) {
        picker.hide(); // ESC, TAB or ENTER keys hide calendar
      } else if (which === 8 || which === 46) {
        this.value("").fire("change"); // BACKSPACE, DELETE clear value
      } else if (which === 17) {
        // CONTROL toggles calendar mode
        toggleState();
      } else {
        var delta;

        if (which === 74 || which === 40) {
          delta = 7;
        } else if (which === 75 || which === 38) {
          delta = -7;
        } else if (which === 76 || which === 39) {
          delta = 1;
        } else if (which === 72 || which === 37) {
          delta = -1;
        }

        if (delta) {
          var currentDate = this.get("valueAsDate") || new Date();
          var expanded = picker.get("aria-expanded") === "true";

          if (expanded && (which === 40 || which === 38)) {
            currentDate.setMonth(currentDate.getMonth() + (delta > 0 ? 4 : -4));
          } else if (expanded && (which === 37 || which === 39)) {
            currentDate.setMonth(currentDate.getMonth() + (delta > 0 ? 1 : -1));
          } else {
            currentDate.setDate(currentDate.getDate() + delta);
          }

          this.value(formatLocalDate(currentDate)).fire("change");
        }
      } // prevent default action except if it was TAB so
      // do not allow to change the value manually


      return which === 9;
    },
    _blurPicker: function _blurPicker(picker) {
      picker.hide();
    },
    _focusPicker: function _focusPicker(picker, toggleState) {
      if (this.get("readonly")) return false;
      var offset = this.offset();
      var pickerOffset = picker.offset();
      var marginTop = offset.height; // #3: move calendar to the top when passing cross browser window bounds

      if (HTML.clientHeight < offset.bottom + pickerOffset.height) {
        marginTop = -pickerOffset.height;
      } // always reset picker mode to the default


      toggleState(false); // always recalculate picker top position

      picker.css("margin-top", marginTop).show();
    }
  });
  DOM.extend("dateinput-picker", {
    constructor: function constructor() {
      var object = DOM.create("<object type='text/html' width='100%' height='100%'>"); // non-IE: must be BEFORE the element added to the document

      if (!IE) {
        object.set("data", "about:blank");
      } // load content when <object> is ready


      this.on("load", {
        capture: true,
        once: true
      }, ["target"], this._loadContent.bind(this)); // add object element to the document

      this.append(object); // IE: must be AFTER the element added to the document

      if (IE) {
        object.set("data", "about:blank");
      }
    },
    _loadContent: function _loadContent(object) {
      var pickerRoot = DOM.constructor(object.get("contentDocument"));
      var pickerBody = pickerRoot.find("body"); // initialize picker content

      pickerRoot.importStyles(PICKER_CSS);
      pickerBody.set(PICKER_BODY_HTML); // trigger callback

      this._readyCallback(pickerBody); // cleanup function reference


      delete this._readyCallback;
    }
  });
  DOM.importStyles(MAIN_CSS);
})();