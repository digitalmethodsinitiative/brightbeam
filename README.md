# Brightbeam

[![DOI](https://zenodo.org/badge/306277620.svg)](https://zenodo.org/badge/latestdoi/306277620)

<p align="center"><img alt="A screenshot of Brightbeam, displaying its 'Graph' view of detected third-party trackers" src="images/example_screenshot.png"></p>

Brightbeam is a continuation/fork of [Mozilla Lightbeam](https://github.com/mozilla/lightbeam), a Firefox extension made 
to "help users understand the array of first and third party companies people interact with every day across the Web".

While active, it keeps track of what sites you visit, and what external content those sites load. Known trackers can be
identified and the aggregate data can be exported to study with external tools like [Gephi](https://gephi.org/).

Lightbeam was discontinued by Mozilla in 2017. Because its functionality is quite useful for people who wish to research
trackers (rather than block them), Brightbeam seeks to build upon Lightbeam to offer functionality specifically for that
purpose.

## Installation
Brightbeam is in semi-active development. .xpi files of work-in-progress versions are available on the 
[releases](https://github.com/digitalmethodsinitiative/brightbeam/releases) page. These are signed and can be installed 
in any Firefox-based browser. If you want to run the latest development version instead, you can [do so from the Firefox
debugging console](https://www.youtube.com/watch?v=sAM78GU4P34&feature=emb_title).

Note that we are not able to include the full tracker database (trackers.json) in this Github repository. The format is 
however straightforward and it should be easy to adapt your own database of trackers to it.

## Credits & license
Brightbeam was developed on top of Lightbeam by Stijn Peeters for the 
[Digital Methods Initiative](https://digitalmethods.net) and is licensed under the Mozilla Public License, 2.0. Refer 
to the LICENSE file for more information.
