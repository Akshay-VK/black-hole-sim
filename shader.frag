#version 330 core

// uniform vec3 color;
uniform vec3 position;
uniform vec3 lookat;
uniform vec3 up;

uniform sampler2D starfield;

in vec3 color;

layout (location = 0) out vec4 out_color;


vec3 raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    for(int i = 0; i < 100; i++) {
        vec3 p = ro + rd * t;
        float d = length(p) - 1.0; // distance to sphere of radius 1
        if(d < 0.01) {
            return vec3(dot(p,vec3(0.5773))); // hit
        }else if(d> 100.0) {
            break; // too far
        }
        t+=d;
    }
    return vec3(1.0,0.0,0.0); // miss
    
}

void main() {
    vec3 f = normalize(lookat);          // forward
    vec3 r = normalize(cross(f, up));     // right
    vec3 u = cross(r, f);                    // corrected up

    mat3 viewRot = mat3(r, u, -f);

    vec3 dir = normalize(viewRot*(color*2.0-1.0));
    vec3 res = raymarch(position, dir);
    if(res==vec3(1.0,0.0,0.0)){
        vec2 uv_coord=vec2(
            0.5+(atan(dir.x,dir.z)/6.283185),
            0.5+(asin(dir.y)/3.141592)
        );
        out_color = texture(starfield, uv_coord);
        return;
    }
    out_color = vec4(res, 1.0);
    return;
}