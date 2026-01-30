function estimateVisualWidth(text) {
                                let width = 0;
                                const wideChars = 'WMmw@';
                                const narrowChars = 'il1|![]{}()';
                                for (let char of text) {
                                    if (wideChars.includes(char)) {
                                        width += 1.3; // Wide characters
                                    } else if (narrowChars.includes(char)) {
                                        width += 0.6; // Narrow characters
                                    } else if (char === ' ') {
                                        width += 0.4; // Spaces
                                    } else {
                                        width += 1.0; // Normal characters
                                    }
                                }
                                return width;
                            }
