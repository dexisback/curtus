# we are making an online video-player UI page+dashboard.

### high level overview: 
- the reference image 1 and 2 in the prompt are the wireframes of how our page is supposed to look like high-level ( more descriptions below )
- maintain a separate file for each component
- we shall define the /home page into three main sections, "the sidebar (left), the video-player-component, and the right misc section(more on this later)"

---
### video player component:
- what is it supposed to do: user uploads a video > the video plays on our video-player-component, the component tries best to auto-scale and adjust its size to match the proportions of the given video. this way we avoid making the UI look bad. Maybe add a loading... sequence while we generate the component window
- the video-player-component contains a thin minimal play duration bar, covering the view-width of the component, the dot in it moving forward as video plays. 
- to the left of the duration bar lies a pause/play minimal button, switches logo smoothly (300ms, motion, easeinout) on the basis of the current state of the video 
- for reference, the video player component is a "panel" display (as visible in ref image 2), with subtle shadows to give it a 3D effect, VERY minimal rugged background, offwhite theme , round edges, and pill shaped ethos. keep padding good and a polished feel. 


---
### left dashboard bar:
- default state: (ref image 1) a "three lined" button which makes the state of the dashboard open/close based onClick. the dashboard opens with motion, staggered buttons, blur animation unblurring out, microinteractions
The left bar is typical modern design dashboard buttons, which open up on clicking the "three-lines" button with a motion animation, the buttons close and open up with a staggering animation
- use placeholder texts for every button , and everything for now. we are building the UI , labelling and api calls to be define later onwards, expose the functionality of api calls to be added later and generate the file/folder structure for it asw
- the buttons have a decent border radius, rounded edges, and a final CTO button on bottom of the sidebar. this button will be the "create new" button with a plus sign on it



---

### right misc section
- boundaries invisible, section for the "profile circle" button
- the "profile circle" button lies on top-right of our /home page, drops down with motion animation and microinteractions/staggering,
- currently, keep the 3-4 text-sections/button on dropdown as placeholder, we will iterate later 



---
### proportions of the /home page:
the left sidebar = 20%, video-player-component = remainder, right misc section - doesnt matter, only the profile circle button on top right, the video player can take as much space as it wants towards the right 
---
make no mistakes, follow the wireframe, develop a good minimal color philosophy
