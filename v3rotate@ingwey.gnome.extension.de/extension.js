/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GLib from 'gi://GLib';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import {QuickToggle, SystemIndicator, QuickSettingsItem} from 'resource:///org/gnome/shell/ui/quickSettings.js';
import Gio from 'gi://Gio';



/* Gio.Subprocess */
Gio._promisify(Gio.Subprocess.prototype, 'communicate_async');
Gio._promisify(Gio.Subprocess.prototype, 'communicate_utf8_async');
Gio._promisify(Gio.Subprocess.prototype, 'wait_async');
Gio._promisify(Gio.Subprocess.prototype, 'wait_check_async');

/* Ancillary Methods */
Gio._promisify(Gio.DataInputStream.prototype, 'read_line_async',
    'read_line_finish_utf8');
Gio._promisify(Gio.OutputStream.prototype, 'write_bytes_async');


const RotationToggle = GObject.registerClass(
class RotationToggle extends QuickToggle {
    constructor() {
        super({
            title: _('V3 Rotate'),
            iconName: 'object-rotate-right-symbolic',
            toggleMode: true,
        });
        
        this.connect('clicked', async () => {
            var miniGrep = function(value, patternToSearch) {
                var regexPatternToSearch = new RegExp("^.*(" + patternToSearch + ").*$", "mg");
                var match = value.match(regexPatternToSearch);
                return match;
            }

            var getArrayLineResult = function(aSearchLines, sPattern, sSeperator) {
                var aLineItems = [];
                var sValue = "";
                aSearchLines.forEach(item => item.split(sSeperator).forEach(item => aLineItems.push(item)));
                aLineItems.forEach(item => {
                    var result = item.split(":");
                    if(result[0] === sPattern) {
                        sValue = result[1].trim();
                    }
                });

                return sValue;
            };

            var getConnectorResult = function(aSearchLines, sPattern, sSeperator) {
                var aLineItems = [];
                var sValue = "";
                aSearchLines.forEach(item => item.split(sSeperator).forEach(item => aLineItems.push(item)));                
                aLineItems.forEach(item => {
                    var result = item.split(" ");
                    if(result && Array.isArray(result)) {
                        result.forEach(item => { 
                            if(item.trim() === sPattern ) {
                                sValue = item.trim();
                            }
                        });
                    }
                });

                return sValue;
            };

            try {
                const proc = Gio.Subprocess.new(['gnome-randr', 'query' ],
                    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
            
                const [stdout, stderr] = await proc.communicate_utf8_async(null, null);
            
                if (proc.get_successful()) {
                    console.log(stdout);

                    var rotateLine = miniGrep(stdout, "rotation");
                    var sRotation = "";
                    sRotation = getArrayLineResult(rotateLine, "rotation", ", ");
                    var bIsInternalDisplay = false;
                    var builtinBatLine = miniGrep(stdout, "is-builtin");
                    bIsInternalDisplay = getArrayLineResult(builtinBatLine, "is-builtin", ", ");
                    var sConnector = "";
                    var connectorLine = miniGrep(stdout, "eDP-1");

                    if(!connectorLine){
                        connectorLine = miniGrep(stdout, "LVDS1");
                        console.log(connectorLine);                        
                    }

                    sConnector = getConnectorResult(connectorLine, "eDP-1"), " ";
                    if(sConnector === "") {
                        sConnector = getConnectorResult(connectorLine, "LVDS1", " "); 
                    }

                    console.log(sRotation);
                    console.log(bIsInternalDisplay);
                    console.log(sConnector);

                    if(bIsInternalDisplay) {
                        if(sRotation === "normal") {
                            const proc2 = Gio.Subprocess.new(['gnome-randr', 'modify', sConnector, "--persistent", "--rotate", "right"  ],
                                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
                        
                            const [stdout2, stderr2] = await proc2.communicate_utf8_async(null, null);
                            console.log(stdout2);
                            console.log(stderr2);
                        } else {
                            const proc3 = Gio.Subprocess.new(['gnome-randr', 'modify', sConnector, "--persistent", "--rotate", "normal"  ],
                                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
                        
                            const [stdout3, stderr3] = await proc3.communicate_utf8_async(null, null);
                            console.log(stdout3);
                            console.log(stderr3);
                        }
                    }
                } else
                    throw new Error(stderr);
            } catch (e) {
                logError(e);
            }
        });
    }
});

const RotationIndicator = GObject.registerClass(
class RotationIndicator extends SystemIndicator {
    constructor() {
        super();

        this._indicator = this._addIndicator();
        this._indicator.iconName = 'object-rotate-right-symbolic';

        const toggle = new RotationToggle();
        toggle.bind_property('checked',
            this._indicator, 'visible',
            GObject.BindingFlags.SYNC_CREATE);  
        this.quickSettingsItems.push(toggle);
    }
});

export default class QuickSettingsExampleExtension extends Extension {
    enable() {
        this._indicator = new RotationIndicator();
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
    }

    disable() {
        this._indicator.quickSettingsItems.forEach(item => item.destroy());
        this._indicator.destroy();
    }
}
