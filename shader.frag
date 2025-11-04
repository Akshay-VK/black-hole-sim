#version 330 core

// uniform vec3 color;
uniform vec3 position;
uniform vec3 lookat;
uniform vec3 up;
uniform float time;

uniform sampler2D starfield;

in vec3 color;

layout (location = 0) out vec4 out_color;

float sdRoundedCylinder( vec3 p, float ra, float rb, float h ){
  vec2 d = vec2( length(p.xz)-ra+rb, abs(p.y) - h + rb );
  return min(max(d.x,d.y),0.0) + length(max(d,0.0)) - rb;
}
float opSubtraction( float d1, float d2 ){
    return max(-d1,d2);
}

float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 perm(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}

float noise(vec3 p){
    vec3 a = floor(p);
    vec3 d = p - a;
    d = d * d * (3.0 - 2.0 * d);

    vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
    vec4 k1 = perm(b.xyxy);
    vec4 k2 = perm(k1.xyxy + b.zzww);

    vec4 c = k2 + a.zzzz;
    vec4 k3 = perm(c);
    vec4 k4 = perm(c + 1.0);

    vec4 o1 = fract(k3 * (1.0 / 41.0));
    vec4 o2 = fract(k4 * (1.0 / 41.0));

    vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
    vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

    return o4.y * d.y + o4.x * (1.0 - d.y);
}

float fbm(vec3 p) {
  vec3 q = p + 0.5 * vec3(1.0, -0.2, -1.0);
  float g = noise(q);

  float f = 0.0;
  float scale = 0.5;
  float factor = 2.02;

  for (int i = 0; i < 6; i++) {
      f += scale * noise(q);
      q *= factor;
      factor += 0.21;
      scale *= 0.5;
  }

  return f;
}

vec3 bg(vec3 dir){
    vec2 uv_coord=vec2(
        0.5+(atan(dir.x,dir.z)/6.283185),
        0.5+(asin(dir.y/length(dir))/3.141592)
    );
    return texture(starfield, uv_coord).xyz;
}
/*
const float T0 = 2.0e7;   // base temperature at inner radius (Kelvin)
const float Rin = 0.5;    // inner radius (scale so Rin = 1)
const float b = 2.897e-2; // Wien's constant (m*K)

// Convert wavelength (nm) to approximate RGB (linear space)
vec3 wavelengthToRGB(float lambda) {
    float t = clamp((lambda - 380.0) / (780.0 - 380.0), 0.0, 1.0);
    float r = smoothstep(0.0, 0.5, 1.0 - abs(t - 0.1)*3.0);
    float g = smoothstep(0.2, 0.6, 1.0 - abs(t - 0.5)*3.0);
    float b = smoothstep(0.5, 0.9, 1.0 - abs(t - 0.9)*3.0);
    return vec3(r, g, b);
}
// given radius and motion angle, return RGB
vec3 accretionColor(float r, float dirDotView) {
    // 1. Temperature falloff (avoid divide by zero)
    r = max(r, Rin);
    float T = T0 * pow(Rin / r, 0.75);
    
    // 2. Peak wavelength (Wien’s law)
    float lambda_peak = (b / T) * 1e9; // in nm

    // 3. Map wavelength to RGB
    vec3 rgb = wavelengthToRGB(lambda_peak);
    
    // 4. Intensity drop with distance
    float intensity = pow(Rin / r, 2.0);
    
    // 5. Simple relativistic color shift (Doppler approximation)
    // dirDotView < 0: moving toward viewer → blue shift
    // dirDotView > 0: moving away → red shift
    float doppler = 1.0 + 0.3 * (-dirDotView); // tweak factor 0.3 for effect
    lambda_peak *= doppler;
    rgb = wavelengthToRGB(lambda_peak);
    
    // 6. Apply intensity scaling
    rgb *= intensity;
    
    // 7. Tone mapping / gamma
    rgb = pow(rgb, vec3(0.45)); // approximate gamma correction

    return rgb;
}
*/

float distanceFunction(vec3 p) {
    // return length(p) - 1.0; // distance to sphere of radius 1
    float h=0.05;
    float ir=0.25;
    float or=2.0;
    return opSubtraction(sdRoundedCylinder(p, ir, h/2.0, h),sdRoundedCylinder(p, or, h/2.0, h));
}

float densityFunc(vec3 p){
    float v = fbm(p*10.0);
    float val =(-distanceFunction(p)*v);
    // return 0.5*(pow(val,0.4)+1.0);
    return val*3.0;
}

vec3 revolve(vec3 p, float t, float d){
    // float omega = 0.04/d;
    float omega = 0.04;
    float angle = omega * t-(d);
    float cosA = cos(angle);
    float sinA = sin(angle);
    mat3 rotY = mat3(
        cosA, 0.0, sinA,
        0.0, 1.0, 0.0,
        -sinA, 0.0, cosA
    );
    return rotY * p;
}

vec3 rk4(vec3 p, float d, vec3 rd, float dt, float G, float M) {
    //(dt*G*(p/pow(d,3.0))*M)
    //new acc=G*(p/pow(d,3.0))*M
    // vec3 a0 = -normalize(p) * (G * M) / (d * d);
    vec3 a0 = -p*(G/(d*d*d))*M;
    vec3 v1 = normalize(rd+(a0*dt*0.5));
    vec3 r1 = p+(rd*dt*0.5);
    float d1 = length(r1);

    // vec3 a1 = -normalize(r1) * (G * M) / (d1 * d1);
    vec3 a1 = -r1*(G/(d1*d1*d1))*M;
    vec3 v2 = normalize(rd+(a1*dt*0.5));
    vec3 r2 = p+(v1*dt*0.5);
    float d2 = length(r2);

    // vec3 a2 = -normalize(r2) * (G * M) / (d2 * d2);
    vec3 a2 = -r2*(G/(d2*d2*d2))*M;
    vec3 v3 = normalize(rd+(a2*dt));
    vec3 r3 = p+(v2*dt);
    float d3 = length(r3);

    // vec3 a4 = -normalize(r3) * (G * M) / (d3 * d3);
    vec3 a4 = -r3*(G/(d3*d3*d3))*M;
    vec3 v4 = normalize(rd+(a4*dt));

    vec3 acc = (a0 + 2.0*a1 + 2.0*a2 + a4)*dt / 6.0;
    return (rd + 2.0*v1 + 2.0*v2 + v4)*dt / 6.0;
}

vec3 raymarch(vec3 ro, vec3 rd) {
    float G=0.3;
    float c=3.0;
    // float R=0.66; // Schwarzschild radius
    float M=1.0;
    float R=2.0*G*M/(c*c); // Schwarzschild radius

    vec3 res=vec3(0.0);

    vec3 sunDirection=vec3(0.5773);


    float d = length(ro);
    vec3 original_rd=normalize(rd);
    for(int i = 0; i < 150; i++) {
        vec3 p = ro;

        // ---- ACCRETION DISK PART ----
        float d_accretion = distanceFunction(p); // distance to sphere of radius 1
        if(d_accretion < -0.01) {
            float density=densityFunc(revolve(p,time,d));
            // return vec3(dot(p,sunDirection)); // hit SOLID SPHERE

            float diffuse = clamp((density - densityFunc(p + 0.3 * sunDirection)) / 0.3, 0.0, 1.0 );
            vec3 lin = vec3(0.7) * 1.1 + 0.8 * vec3(1.0) * diffuse;

            vec3 color = mix(vec3(0.98,0.84,0.39), vec3(0.0, 0.0, 0.0), density*density);
            // color.rgb *= density*lin*1.5/d;
            color.rgb *= density*lin;
            //------PROPER COLOR---------
            // vec3 color=accretionColor(d, dot(rd,normalize(vec3(-p.y,0.0,p.x))));
            //-----------------------------
            // res += pow(color * (1.0 -density),vec3(0.45));
            res += color * (1.0 -density);
        }
        // -------------------------

        // ---- BLACK HOLE PART ----
        d=length(p);
        if(d<R) {
            return res; // hit black hole
        }
        else if(d>200.0){
            break; // too far
        }


        float dt=0.04+(pow(d,3.0))/3246.0;
        rd=normalize(rk4(ro,d,rd,dt,G,M));
        // rd=normalize(rd-(G*p*(0.2/pow(d,3.0))*M));
        // ---- BLACK HOLE PART ----

        ro += rd * dt;
    }
    // if(d>10000.0){
    //     return vec3(1.0,0.0,0.0); // too far
    // }

    // if(ro.y<0.01 && ro.y>-0.01 && length(ro)<3.0){
    //     return vec3(1.0,1.0,1.0); // hit accretion disk
    // }
    
    // return vec3(1.0,0.0,0.0); // miss
    
    return res+bg(rd);
    
}


void main() {
    vec3 f = normalize(lookat);          // forward
    // vec3 f = normalize(lookat-position);          // forward
    vec3 r = normalize(cross(f, up));     // right
    vec3 u = cross(r, f);                    // corrected up

    mat3 viewRot = mat3(r, u, -f);

    vec3 dir = normalize(viewRot*(color*2.0-1.0));
    vec3 res = raymarch(position, dir);
    if(res==vec3(1.0,0.0,0.0)){
        out_color = vec4(bg(dir), 1.0);
        return;
    }
    out_color = vec4(res, 1.0);
    return;
}